#
#   wiot handler, wiot
#   Copyright (C) 2016-2020 Michal Grezl
#
#   This program is free software; you can redistribute it and/or modify
#   it under the terms of the GNU General Public License as published by
#   the Free Software Foundation; either version 3 of the License, or
#   (at your option) any later version.
#
#   This program is distributed in the hope that it will be useful,
#   but WITHOUT ANY WARRANTY; without even the implied warranty of
#   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#   GNU General Public License for more details.
#
#   You should have received a copy of the GNU General Public License
#   along with this program; if not, write to the Free Software Foundation,
#   Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301  USA
#

package Wiot::Server2;

use POSIX qw(strftime);

use utf8;
use JSON;
use DBI;
use Data::Dumper;
use Sys::Syslog;
use Time::HiRes;

use Apache2::Connection ();
use Apache2::Const -compile => qw(OK SERVER_ERROR NOT_FOUND MODE_READBYTES);
use Apache2::Filter ();
use Apache2::Reload;
use Apache2::Request;
use Apache2::RequestIO ();
use Apache2::RequestRec ();
use Apache2::ServerRec ();
use Apache2::URI ();

use APR::Brigade ();
use APR::Bucket ();
use APR::Const -compile => qw(URI_UNP_REVEALPASSWORD SUCCESS BLOCK_READ);
use APR::URI ();
use constant IOBUFSIZE => 8192;

use HTML::Entities;
use Encode;
use LWP::Simple;
use File::Slurp;

use DateTime;

use Data::Uniqid qw(suniqid uniqid luniqid);

use Net::Subnet;
use Net::OAuth;
use Net::OAuth::AccessTokenRequest;

my $dbh;
my %post_data;
my $LIMIT = 0;
my $OFFSET = 0;
my $ORDER = 0;
my $DESC = 0;

my $INTERVAL = 0;
my $FROM = 0;
my $TO = 0;

my $OUTPUT_FORMAT = "";
my %GET = {};
my %values_cache = {};
my %form = {};

my $error_result;
my $error_message;

my $request_id;

my $hostname;

my $nextcloudclientid;
my $nextcloudclientsecret;
my $nextcloudserver;
my $templatepath;

################################################################################
sub handler
################################################################################
{

  openlog('wiot', 'cons,pid', 'local2');

  $r = shift;

  $nextcloudclientid = $r->dir_config("nextcloudclientid");
  $nextcloudclientsecret = $r->dir_config("nextcloudclientsecret");
  $nextcloudserver = $r->dir_config("nextcloudserver");
  $templatepath = $r->dir_config("templatepath");

  $request_id = uniqid;

  my $s = $r->server;
  $s->timeout(20000000);

  $hostname = $r->dir_config("hostname");

  wsyslog('info', "request to $hostname YAY!");

  $LIMIT = 0;
  $OFFSET = 0;
  $ORDER = 0;
  $DESC = 0;
  $OUTPUT_FORMAT = "";
  $INTERVAL = 0;
  $FROM = 0;
  $TO = 0;
  %GET = {};

  $user = $ENV{REMOTE_USER};
  $is_https = $ENV{HTTPS};

  &form_configuration();

  $r->no_cache(1);

  &connect_db();

  if ($r->connection->can('remote_ip')) {
    $remote_ip = $r->connection->remote_ip
  } else {
    $remote_ip = $r->useragent_ip;
  }

  $user = $ENV{REMOTE_USER};
  $is_https = $ENV{HTTPS};
  my $uri = $r->uri;

  &parse_query_string($r);
  &parse_post_data($r);

  $error_result = Apache2::Const::OK;
  $error_message = "";

  if (exists $get_data{limit}) {
    $LIMIT = $get_data{limit};
  }

  if (exists $get_data{offset}) {
    $OFFSET = $get_data{offset};
  }

  if (exists $get_data{order}) {
    $ORDER = $get_data{order};
  }

  if (exists $get_data{desc}) {
    $DESC = 1;
  }

  if (exists $get_data{interval}) {
    $INTERVAL = 1;
  }

  foreach my $i (("from", "to", "interval")){
    if (exists $get_data{$i}) {
      $GET{$i} = $get_data{$i};
    }
  }

#  syslog("info", "handler: interval ". $GET{interval} . " from:" . $GET{from} . " to:" . $GET{to} . ".");

  if (!exists $get_data{output} or $get_data{output} eq "html") {
    $OUTPUT_FORMAT = "html";
    $r->content_type('text/html; charset=utf-8');
  } elsif ($get_data{output} eq "geojson") {
    $OUTPUT_FORMAT = "geojson";
    $r->content_type('text/plain; charset=utf-8');
  } elsif ($get_data{output} eq "json") {
    $OUTPUT_FORMAT = "json";
    $r->content_type('text/plain; charset=utf-8');
  } elsif ($get_data{output} eq "kml") {
    $OUTPUT_FORMAT = "kml";
  }

  @uri_components = split("/", $uri);
  my $api_realm = $uri_components[1];
  my $api_version = $uri_components[2];
  my $api_request = $uri_components[3];
  my $api_param = $uri_components[4];
  my $api_param2 = $uri_components[5];

#FIXME
$user = "anonymous_coward";
#FIXME

  wsyslog('info', "request to $hostname within $api_realm from $remote_ip by $user");
  wsyslog('info', "v: $api_version, r: $api_request, m: " . $r->method());

  $syslog_request = "from " . $GET{from};
  $syslog_request .= ", to " . $GET{to};
  $syslog_request .= ", output " . $OUTPUT_FORMAT;
  $syslog_request .= ", limit " . $LIMIT;
  $syslog_request .= ", offset " . $OFFSET;
  $syslog_request .= ", order " . $ORDER;
  $syslog_request .= ", desc " . $DESC;

  wsyslog('info', $syslog_request);

  my $out = "";

  if ($api_request eq "sensor") {
    if ($r->method() eq "GET") {

      if ($api_param ne "") {
        &sql_data("*", $api_param, $api_param2);
      } else {
        &sql_data("*");
      }

    } elsif ($r->method() eq "DELETE") {
    } elsif ($r->method() eq "POST") {
      &store_data();
      $r->print($error_message);
      wsyslog("info", "store res:".$error_message);
    }
  } elsif ($api_request eq "list") {
    $out = &list_sensors();
    &direct_output_html($out);
  } elsif ($api_request eq "graph") {
    if ($r->method() eq "GET") {
      if ($api_param ne "") {
        my $out = &template($templatepath . "chart3.html", $api_param, $api_param2, $GET{interval}, $GET{from}, $GET{to});
        $r->print($out);
      }
    }
  } elsif ($api_request eq "form") {
    $out = &form_template($templatepath . "form.html", $api_param);
    $r->print($out);

  } elsif ($api_request eq "data") {
    if ($r->method() eq "GET") {
      &wsyslog("info", "data param: $api_param, $api_param2");
      $out = &get_input_value($api_param, $api_param2);
      if ($out eq "") {
        $error_message = "value not known";
        $error_result = 404
      } else {
        $r->print($out)
      }

    } elsif ($r->method() eq "POST") {
      &wsyslog("debug", "data post: param: $api_param, $api_param2");
      $out = "postdata request  data:" . Dumper %post_data;
      foreach $k (keys %post_data) {
        #$sn, $var, $value
        &wsyslog("debug", "data post: kkkkk $k");
        &set_input_value($api_param, $k, $post_data{$k});
      }
      $r->print("OK");
    }
  } elsif ($api_request eq "last") {
    if ($r->method() eq "GET") {
      my ($xts, $xv) = get_cache_value($api_param, $api_param2);
      $out = "xts $xts : xv $xv";
      $r->print($out);
    }
  }

  if ($error_result != Apache2::Const::OK) {
    if ($error_result == 400) {error_400();}
    if ($error_result == 401) {error_401();}
    if ($error_result == 404) {error_404();}
    if ($error_result == 500) {error_500();}
    $r->status($error_result);
  }

  wsyslog('info', "handler result $remote_ip :" . $error_result . " in " . ($end_run_time - $start_run_time) . "s");

  closelog();
  return Apache2::Const::OK;

}

################################################################################
sub error_template()
################################################################################
{
  my ($title, $message) = @_;

  $r->content_type('text/html; charset=utf-8');

  $r->print('<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN">
<html><head>
<title>' . $title . '</title>
</head><body>
<h1>YAY!</h1>
<p>' . $message . '</p>
<hr>
<address>Wframenotwork/3 Ulramegasuperdupercool/0.0.1 Server at ' . $hostname . ' Port 80</address>
</body></html>
');
}


################################################################################
sub direct_output_html()
################################################################################
{
  my $out = shift;
  if ($error_result == Apache2::Const::OK) {
    $r->print($out);
  } else {
    wsyslog(LOG_WARNING, "direct_output_html() error_result" . $error_result);
  }
}


################################################################################
sub parse_query_string
################################################################################
{
  my $r = shift;

  %get_data = map { split("=",$_) } split(/&/, $r->args);


  #sanitize
  foreach (sort keys %get_data) {
#    wsyslog('info', "getdata " . $_ . "=" . $get_data{$_});
    if ($get_data{$_} eq "") {
      next;
    }

    $get_data{$_} =~ s/\%2C/,/g;
    $get_data{$_} =~ s/\%2F/\//g;
    if (lc $_ eq "bbox" or lc $_ eq "lat" or lc $_ eq "lon" ) {
      $get_data{$_} =~ s/[^A-Za-z0-9\.,-]//g;
    } elsif ($_ =~ /output/i ) {
      $get_data{$_} =~ s/[^A-Za-z0-9\.,-\/]//g;
    } else {
      $get_data{$_} =~ s/[^A-Za-z0-9 ]//g;
    }
  }
}

################################################################################
sub parse_post_data
################################################################################
{
  my $r = shift;

  my $raw_data = &read_post($r);

  %post_data = map { split("=",$_) } split(/&/, $raw_data);

  #sanitize
  foreach (sort keys %post_data) {
    &wsyslog('debug', "item from postdata before:" . $_ . "=" . $post_data{$_});
    $post_data{$_} = &smartdecode($post_data{$_});
    $post_data{$_} =~ s/\+/ /g;
    $post_data{$_} =~ s/\%2F/\//g;
    $post_data{$_} =~ s/\%2C/,/g;

    if (lc $_ eq "id" ) {
      $post_data{$_} =~ s/[^A-Za-z0-9_\/]//g;
    } elsif (lc $_ eq "w_sensor" ) {
      $post_data{$_} =~ s/[^\.\:\;\-A-Za-z0-9_ \p{IsLatin}\/,\;]//g;
    } else {
      $post_data{$_} =~ s/[^A-Za-z0-9 ]//g;
    }
    wsyslog('debug', "item from postdata after:" . $_ . "=" . $post_data{$_});
  }
}

################################################################################
sub connect_db
################################################################################
{
  my $dbpath = $r->dir_config("dbpath");
  #my $dbpath = "/var/www/grezl.eu/wiot.sqlite";
  #$dbpath = "/tmp/wiot.sqlite";
  my $dbfile = $dbpath;

  $dbh = DBI->connect("dbi:SQLite:$dbfile", "", "",
    {
       RaiseError     => 0,
       sqlite_unicode => 1,
    }
  ) or do {
    wsyslog('info', "Cannot connect to db: " . $DBI::errstr);
    die;
  };
}


################################################################################
sub read_post()
################################################################################
{
  my $r = shift;
  my $bb = APR::Brigade->new($r->pool, $r->connection->bucket_alloc);
  my $data = '';
  my $seen_eos = 0;
  do {
    $r->input_filters->get_brigade($bb, Apache2::Const::MODE_READBYTES, APR::Const::BLOCK_READ, IOBUFSIZE);
    for (my $b = $bb->first; $b; $b = $bb->next($b)) {
      if ($b->is_eos) {
          $seen_eos++;
        last;
      }
      if ($b->read(my $buf)) {
        $data .= $buf;
      }
      $b->remove; # optimization to reuse memory
    }
  } while (!$seen_eos);
  $bb->destroy;
  return $data;
}

################################################################################
sub smartdecode
################################################################################
{
  use URI::Escape qw( uri_unescape );
  my $x = my $y = uri_unescape($_[0]);
  return $x if utf8::decode($x);
  return $y;
}

################################################################################
sub store_data
################################################################################
{
  my ($id, $lat, $lon) = @_;
  my $query;

  $post_data{w_sensor} =~ s/\;.*//g;

 # wsyslog("info", "store:" . $post_data{w_sensor});

  my %sensor_data;
  foreach $key (split(/,/, $post_data{w_sensor})) {
#    wsyslog("info", "store: split (" . $key . ")");
    @parts = split(':', $key);
#    wsyslog("info", "store: parts [" . $parts[0] . "][" . $parts[1] . "]");

    if ($parts[1] ne "") {
      $sensor_data{$parts[0]} = &trim($parts[1]);
    }
  }

#  my %sensor_data = map { split(":",$_) } split(/,/, $post_data{w_sensor});

#  foreach $key (keys %sensor_data) {
#    wsyslog("info", "store: hash (" . $key . ")(" . $sensor_data{$key} . ")");
#  }


  my $sn = $sensor_data{sn};
  if ($sn eq "") {
    wsyslog('info', $remote_ip . " store_data(): sn is empty");
    $error_result = 500;
    $error_message = "NO SN";
    return;
  }

  my $ts = $sensor_data{ts};
  my $pq;
  my $type = $sensor_data{type};
  my $count = $sensor_data{count};
  my $systemts = time();

  wsyslog('debug', "store_data(): ts is empty, systemts $systemts");

  if ($count ne "") {
    #multi count data, alter $ts
    $t = (10 - $count) * 600;
    if ($ts eq "") {
      $ts = $systemts - $t;
    } else {
      $ts -= $t;
    }

    wsyslog('info', "count found: before " . $sensor_data{ts} . " after ". $ts );
  }

  foreach $i (keys %sensor_data) {
    if ($i eq "sn" or $i eq "ts" or $i eq "type" or $i eq "count") {
      next;
    }

    if ($ts eq "") {
      #systemts set by db
      $query = "insert into data (sn, ts, pq, value) values (?, ?, ?, ?)";
    } else {
      #ts is defined, force it as systemts
      $query = "insert into data (sn, systemts, pq, value) values (?, ?, ?, ?)";
    }
    my $pq = $i;
    my $value = $sensor_data{$i};

    &set_cache_value($sn, $pq, ($ts ne "")?$ts:$systemts, $value);

    wsyslog('info', $remote_ip . " store ($type) ($sn) ($ts,$systemts) ($pq) ($value)");

    my $res = $dbh->do($query, undef, $sn, $ts, $pq, $value) or do {
      wsyslog("info", "store: dbi error " . $DBI::errstr);
      $error_message = "store: NOT OK " . $DBI::errstr;
      $error_result = 500;
    };
  }

  wsyslog("info", "store: ok");
  $error_message = "OK";
}


################################################################################
sub sql_data
################################################################################
{
  my ($what, $sn, $pq) = @_;

  wsyslog("info", "sql_data(): $what, $sn, $pq");

  my $query = "select $what from data";

  if ($sn) {
    $query .= " where sn='$sn' ";
  }

  if ($pq) {
    $query .= " and pq='$pq' ";
  }

  if ($ORDER) {
    $query .= " order by " . $ORDER;
  }

  if ($DESC) {
    $query .= " desc ";
  }

  if ($LIMIT) {
    $query .= " limit " . $LIMIT;
  }

  if ($OFFSET) {
    $query .= " offset " . $OFFSET;
  }

  &output_data($query, $sn, $pq);
}

################################################################################
sub list_pq()
################################################################################
{
  my $sensor_id = shift;
  my $out = "";
  my $url = "http://" . $hostname . "/wiot/v1/sensor";

  $query = "select distinct pq from data where sn='".$sensor_id."'";
  $res = $dbh->selectall_arrayref($query) or do {
    wsyslog("info", "list_pq dberror" . $DBI::errstr);
    $error_result = 500;
    return 500;
  };

  $out .= "<ul>\n";
  foreach my $row (@$res) {
    my ($pq) = @$row;
    $out .= "<li>\n";
    $out .= "<a href='$url/$sensor_id/$pq?limit=4&order=id&desc'>$pq</a>\n";
    my ($xts, $xv) = get_cache_value($sensor_id, $pq);
#    $out .= "[".&get_current_val($sensor_id, $pq)."]\n";
    $out .= "[".$xv."]\n";
    my $from = time() - (7*24*3600);
    $out .= "<a href='http://" . $hostname . "/wiot/v1/graph/$sensor_id/$pq?interval=hourly&from=$from'>graph</a>\n";
    $out .= "</li>\n";
  }
  $out .= "</ul>\n";

  return $out;
}

################################################################################
sub list_sensors
################################################################################
{
  my $out = &page_header();

  $query = "select distinct sn from data";

  $res = $dbh->selectall_arrayref($query) or do {
    wsyslog("info", "list_sensors dberror " . $DBI::errstr);
    $error_result = 500;
    return 500;
  };

  my $num_elements = @$res;

  if (!$num_elements) {
    $out .= "nic elementu";
  }

  my $url = "http://" . $hostname . "/wiot/v1/sensor";

  $out .= "<h1>Sensors</h1>\n";
  $out .= "<ol>\n";
  foreach my $row (@$res) {
    my ($sn) = @$row;
    $out .= "<li>";
    $out .= "$sn: values:<a href='$url/$sn?limit=4&order=id&desc'>$sn</a>\n";
    $out .= &list_pq($sn);
    $out .= "</li>\n";
  }
  $out .= "</ol>\n";
  $out .= &page_footer();

  return $out;
}

################################################################################
sub output_data
################################################################################
{
  my ($query, $sn, $pq) = @_;
  my $ret;

  my $start_time = [Time::HiRes::gettimeofday()];

  wsyslog("info", "output_data in $OUTPUT_FORMAT query:" . $query);

  if ($OUTPUT_FORMAT eq "html") {
    $ret = output_html($query);
  } elsif ($OUTPUT_FORMAT eq "geojson") {
    $ret = output_geojson($query);
  } elsif ($OUTPUT_FORMAT eq "json") {
    $ret = output_json($query, $sn, $pq);
  } elsif ($OUTPUT_FORMAT eq "kml") {
    $ret = output_kml($query);
  }

  my $diff = Time::HiRes::tv_interval($start_time);

  wsyslog("info", "output_data result:" . $ret . " in $diff s");

  return $ret;
}

################################################################################
sub output_json
################################################################################
{
  use utf8;

  my $x;
  my @res;

  my ($query, $sn, $pq) = @_;

  wsyslog("info", "output_json: is interval? " . $INTERVAL);

  if ($ORDER) {
    $query .= " order by " . $ORDER;
  }

  if ($DESC) {
    $query .= " desc ";
  }

  if ($LIMIT) {
    $query .= " limit " . $LIMIT;
  }

  if ($OFFSET) {
    $query .= " offset " . $OFFSET;
  }

#we start at 1476698939

  if ($INTERVAL) {
    my @intervals;

    if ($GET{from} > 0) {
      $dtf = DateTime->from_epoch(epoch => $GET{from});
    } else {
#      $dtf = DateTime->now->subtract(days => 7);
      $dtf = DateTime->from_epoch(epoch => "1476698939");
    }

    if ($GET{to} > 0) {
      $dtt = DateTime->from_epoch(epoch => $GET{to});
    } else {
      $dtt = DateTime->now;
    }

    wsyslog("info", "output_json dtt $dtt dtf $dtf !!!");

    if ($GET{interval} eq "hourly") {
      @intervals = &hourly($dtf->epoch, $dtt->epoch);
    } elsif ($GET{interval} eq "minutely") {
      @intervals = &minutely($dtf->epoch, $dtt->epoch, 1);
    } elsif ($GET{interval} eq "decaminutely") {
      @intervals = &minutely($dtf->epoch, $dtt->epoch, 10);
    } elsif ($GET{interval} eq "daily") {
      @intervals = &daily($dtf->epoch, $dtt->epoch);
    } elsif ($GET{interval} eq "weekly") {
      @intervals = &weekly($dtf->epoch, $dtt->epoch);
    } elsif ($GET{interval} eq "monthly") {
      @intervals = &monthly($dtf->epoch, $dtt->epoch);
    }

    my $aa = 0;
    for (my $i = 0; $i < scalar @intervals; $i++) {
#      my $query = "select avg(value) from data where sn='$sn' and pq='$pq' and systemts>".$intervals[$i]." and systemts<".$intervals[$i+1];
      my $query = "select CAST(AVG(value) AS DECIMAL(3,2)) from data where sn='$sn' and pq='$pq' and systemts>".$intervals[$i]." and systemts<".$intervals[$i+1];
      my @avg = $dbh->selectrow_array($query) or do {
        wsyslog("info", "output_json bad query: ($query) - ".$DBI::errstr);
        next;
      };

      if ($avg[0]) {
        my $val = sprintf "%.3f", $avg[0];
        $res[$aa++] = [$intervals[$i], $val];
      } else {
        $res[$aa++] = [$intervals[$i], "na"];
      }

#      wsyslog("info", "output_json " . $avg[0] . " intervals query:" . $query);
    }

    #$x =  Dumper @res;
    $x = encode_json(\@res);

  } else {

    wsyslog("info", "output_json query:" . $query);

    $res = $dbh->selectall_arrayref($query) or do{
      wsyslog("info", "output_json ".$DBI::errstr);
      return Apache2::Const::SERVER_ERROR;
    };

    $x =  Dumper @res;
  }

#  $r->print(encode_json($res));
  $r->print($x);
  return Apache2::Const::OK;
}

################################################################################
sub output_html
################################################################################
{
  my ($query) = @_;

  @s = (
  );

  @l = (
  );

  my $out = &page_header(\@s,\@l);


#  $res = $dbh->selectall_hashref($query, 'id');
#  $res->{$id}->{name};

  $res = $dbh->selectall_arrayref($query);
  if (!$res) {
    wsyslog("info", "output_html dberror" . $DBI::errstr);
    $error_result = 500;
    return 500;
  }

  my $num_elements = @$res;

  if (!$num_elements) {
    $out .= "nic elementu v html";
 #   return Apache2::Const::NOT_FOUND;
  }

  $out .= "<!-- user is $user --> $query\n";

  $out .= "<table border='1'>";
  $out .="<th>id</th><th>sn</th><th>ts</th><th>pq</th><th>value</th><th>systemts</th>";

  foreach my $row (@$res) {
    my ($id,$sn,$ts,$pq,$value,$systemts) = @$row;
    $out .= "<tr>";
    my ($sec,$min,$hour,$mday,$mon,$year,$wday,$yday,$isdst) = localtime($systemts);
    foreach (@$row) {
      $out .= "<td>".$_."</td>\n";
    }
    $out .= "<td>". (strftime "%a %d %m %Y %H:%M:%S", localtime($systemts)) ."</td>\n";
    $out .= "</tr>";
  }
  $out .= "</table>";
  $out .= &page_footer();

  $r->print($out);

  return Apache2::Const::OK;
}

################################################################################
sub page_header()
################################################################################
{
  my ($scripts, $links) = @_;
  my $out = '
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="cache-control" content="no-cache">
  <meta http-equiv="pragma" content="no-cache">
  <title>wiot</title>
';

  foreach $i (@$links) {
    $out .= "  <link rel='stylesheet' type='text/css' href='";
    $out .= $i;
    $out .= "'>\n";
  }

  foreach $i (@$scripts) {
    $out .= "  <script type='text/javascript' src='";
    $out .= $i;
    $out .= "'></script>\n";
  }

  $out .= '</head>
<body>
';

  return $out;
}

################################################################################
sub page_footer()
################################################################################
{
  return '
  <p>'. localtime .' by walley</p>
</body>
</html>
';
}

################################################################################
sub get_current_val()
################################################################################
{
  my ($sn, $pq) = @_;
  $query = "SELECT value FROM data WHERE sn='" . $sn . "' and  pq='" . $pq . "' and (select max(systemts) from data where sn='" . $sn . "' and  pq='" . $pq . "')=systemts";

  wsyslog("info", "get_current_val $query");

  my @res = $dbh->selectrow_array($query) or do {
    wsyslog("info", "get_current_val $query ".$DBI::errstr);
#    $error_result = 500;
    return "not known";
  };

  return $res[0];
}

################################################################################
sub minutely()
################################################################################
{
  my ($fromts, $tots, $mins) = @_;
  my @result;

  my $dt_from = DateTime->from_epoch(epoch => $fromts);
  my $dt_to = DateTime->from_epoch(epoch => $tots);

  for (my $i = $dt_from->clone(); DateTime->compare($i, $dt_to) == -1; $i->add(minutes => $mins)) {
    push @result, $i->epoch;
  }
  push @result, $tots;

  return @result;
}

################################################################################
sub hourly()
################################################################################
{
  my ($fromts, $tots) = @_;
  my @result;

  my $dt_from = DateTime->from_epoch(epoch => $fromts);
  my $dt_to = DateTime->from_epoch(epoch => $tots);

#  for (my $i = $dt_from->clone(); DateTime->compare($i, $dt_to) == -1; $i->add(hours => 1)) {
  for (my $i = $dt_from->clone(); DateTime->compare($i, $dt_to) <= 0; $i->add(hours => 1)) {
    push @result, $i->epoch;
  }
  push @result, $tots;

  return @result;
}

################################################################################
sub daily()
################################################################################
{
  my ($fromts, $tots) = @_;
  my @result;

  my $dt_from = DateTime->from_epoch(epoch => $fromts);
  my $dt_to = DateTime->from_epoch(epoch => $tots);

  for (my $i = $dt_from->clone(); DateTime->compare($i, $dt_to) == -1; $i->add(days => 1)) {
    push @result, $i->epoch;
  }
  push @result, $tots;

  return @result;
}

################################################################################
sub days_to_interval()
################################################################################
{
  my ($fromts, $tots, $days) = @_;
  my @result;

  my $dt_from = DateTime->from_epoch(epoch => $fromts);
  my $dt_to = DateTime->from_epoch(epoch => $tots);

  for (my $i = $dt_from->clone(); DateTime->compare($i, $dt_to) == -1; $i->add(days => $days)) {
    push @result, $i->epoch;
  }
  push @result, $tots;

  return @result;
}

################################################################################
sub weekly()
################################################################################
{
  my ($fromts, $tots) = @_;
  &days_to_interval($fromts, $tots, 7);
}

################################################################################
sub monthly()
################################################################################
{
  my ($fromts, $tots) = @_;
  my @result;

  my $dt_from = DateTime->from_epoch(epoch => $fromts);
  my $dt_to = DateTime->from_epoch(epoch => $tots);

  for (my $i = $dt_from->clone(); DateTime->compare($i, $dt_to) == -1; $i->add(days => 31)) {
    push @result, $i->epoch;
  }
  push @result, $tots;

  return @result;
}

################################################################################
sub template()
################################################################################
{
  my ($file, $p1, $p2, $interval, $from, $to) = @_;
  my $fcontent = "";

  open(my $fh, "<", $file) or do {
    return "nic template";
  };

  $fcontent = read_file($file);
  #@fcontent = <$fh>;
  $fcontent =~ s/\[PQ\]/$p2/gi;
  $fcontent =~ s/\[SN\]/$p1/gi;
  $fcontent =~ s/\[INTERVAL\]/$interval/gi;
  $fcontent =~ s/\[FROM\]/$from/gi;
  $fcontent =~ s/\[TO\]/$to/gi;
  return $fcontent;
}

################################################################################
sub wsyslog
################################################################################
{
  my ($a, $b) = @_;
  syslog($a, $request_id. " " . $b);
}

################################################################################
sub error_400()
################################################################################
{
  $r->content_type('text/html; charset=utf-8');

  $r->print('<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN">
<html><head>
<title>400 Bad request</title>
</head><body>
<h1>This is bad</h1>
<p>and you should feel bad</p>
<hr>
<address>openstreetmap.social/2 Ulramegasuperdupercool/0.0.1 Server at api.openstreetmap.social Port 80</address>
</body></html>
');
}

################################################################################
sub error_401()
################################################################################
{
  $r->content_type('text/html; charset=utf-8');

  $r->print('<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN">
<html><head>
<title>401 Unauthorized</title>
</head><body>
<h1>You can not do this</h1>
<p>to me:(</p>
<hr>
<address>openstreetmap.social/2 Ulramegasuperdupercool/0.0.1 Server at api.openstreetmap.social Port 80</address>
</body></html>
');
}

################################################################################
sub error_404()
################################################################################
{
  $r->content_type('text/html; charset=utf-8');

  $r->print('<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN">
<html><head>
<title>404 Not Found</title>
</head><body>
<h1>Not Found</h1>
<p>We know nothing about this, except this message</p>
<p><i>'.$error_message.'</i><p>
<hr>
<address>openstreetmap.social/2 Ulramegasuperdupercool/0.0.1 Server at api.openstreetmap.social Port 80</address>
</body></html>
');
}

################################################################################
sub error_412()
################################################################################
{
  $r->content_type('text/html; charset=utf-8');

  $r->print('<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN">
<html><head>
<title>412 Precondition Failed</title>
</head><body>
<h1>FAAAAAAAAAAAAAIIIIIIIIIIIIIILLLLLLL!!!11</h1>
<p>Do NOT fail our preconditions, not cool!</p>
<hr>
<address>openstreetmap.social/2 Ulramegasuperdupercool/0.0.1 Server at api.openstreetmap.social Port 80</address>
</body></html>
');
}

################################################################################
sub error_500()
################################################################################
{
  &error_template("500 Boo Boo","We don\'t know nothing about this");
}

################################################################################
sub trim
################################################################################
{
  my $s = shift;
  $s =~ s/^\s+|\s+$//g;
  return $s
};

################################################################################
sub get_cache_value()
################################################################################
{
  my ($sn, $pq) = @_;

  $cache_ts = $values_cache{$sn}{$pq}[0];
  $cache_v = $values_cache{$sn}{$pq}[1];

  $Data::Dumper::Indent = 0;
  $v .= "val $cache_ts $cache_v " . Dumper %values_cache;
  wsyslog("debug","get_cache_value(): $v");
  return ($cache_ts, $cache_v);
}

################################################################################
sub set_cache_value()
################################################################################
{
  my ($sn, $pq, $ts, $v) = @_;

  my ($c_ts, $c_v) = &get_cache_value($sn, $pq);

  wsyslog("debug","set_cache_value(): $sn, $ts, $pq, $v");

  if ($c_ts) {
    if ($ts > $c_ts) {
      $values_cache{$sn}{$pq} = [$ts, $v];
    } else {
      wsyslog("debug","set_cache_value(): not stored, over ts");
    }
  } else {
    $values_cache{$sn}{$pq} = [$ts, $v];
  }

}


################################################################################
sub form_elements()
################################################################################
{
  my $id = shift;

  &form_configuration();

  my $out = "var elements = {";
  foreach $key (keys %{$form{$id}})
  {
    $out .= "$key:\"$form{$id}{$key}\",";
  }

  $out .= "};";

  return $out;
}

################################################################################
sub form_values()
################################################################################
{
#  $values = "var values = {low:\"15\", hi:\"16\", state:\"1\", x:1};";

  my $sn = shift;
  my $out = "var values = {";

  my $query = "select variable,value from input where sn = ?";

  my $sth = $dbh->prepare($query) or do {
    wsyslog("info", "form_values(): prepare $query, error:".$DBI::errstr);
    return "{}";
  };

  $sth->execute($sn) or do {
    wsyslog("info", "form_values(): execute $query, error:".$DBI::errstr);
    return "{}";
  };

  while(my ($var, $val) = $sth->fetchrow_array()) {
    $out .= "$var:\"$val\",";
  }

  $sth->finish();

  $out .= "};";

  return $out;
}

################################################################################
sub form_configuration()
################################################################################
{
  %form = {};
  $form{thermostat0}{low} = "int";
  $form{thermostat0}{hi} = "int";
  $form{thermostat0}{state} = "bool";
  $form{test}{x} = "int";
}

################################################################################
sub form_template()
################################################################################
{
  my ($file, $serial) = @_;

  wsyslog("info","form_template(): $file, $serial");

  my $data;

  $elements = &form_elements($serial);
  $values = "var values = {low:\"15\", hi:\"16\", state:\"1\", x:1};";
  $values = &form_values($serial);

  $array = $elements . "\n" . $values . "\n";

  $data{max} = 16;
  $data{min} = 15;
  $data{state} = 1;

  my $fcontent = "";

  open(my $fh, "<", $file) or do {
    return "nic template";
    wsyslog("info","form_template(): failed to open");
  };

  $fcontent = read_file($file);
  #@fcontent = <$fh>;
  $fcontent =~ s/\[PQ\]/$p2/gi;
  $fcontent =~ s/\[SN\]/$serial/gi;
  $fcontent =~ s/\[INTERVAL\]/$interval/gi;

  $fcontent =~ s/\[ARRAY\]/$array/gi;
  return $fcontent;
}


################################################################################
sub get_input_value()
################################################################################
{
  my ($sn, $var) = @_;

  my $query = "select value from input where sn = ? and variable = ?";

  my @res = $dbh->selectrow_array($query, undef, $sn, $var) or do {
    wsyslog("info", "get_input_value(): $query, error:".$DBI::errstr);
    return "";
  };

  return $res[0];
}

################################################################################
sub set_input_value()
################################################################################
{
  my ($sn, $var, $value) = @_;

  wsyslog("info", "set_input_value(): setting $sn: $var=$value");

  my $query = "update input set value = ? where sn = ? and variable = ?";

  my $sth = $dbh->prepare($query);
  $sth->execute($value, $sn, $var) or do {
    wsyslog("info", "set_input_value(): $query, error:".$DBI::errstr);
    $error_result = 500;
    $error_message = "set_input_value() failed";
  };

  return;
}

################################################################################
sub check_ban()
################################################################################
{
  my $banned = subnet_matcher qw(
    66.249.69.0/24
    66.249.64.0/24
    66.249.64.0/19
    151.80.31.102/32
    157.60.0.0/16
    157.56.0.0/14
    157.54.0.0/15
    91.232.82.106/32
    164.132.161.7/32
    137.74.207.164/32
    51.254.0.0/16
    51.255.0.0/16
  );

#doubrava  185.93.61.0/24
  return ($banned->($remote_ip));
}

################################################################################
sub check_privileged_access()
################################################################################
{
  my $ok = subnet_matcher qw(
    185.93.61.0/24
    185.93.60.0/22
    195.113.123.32/28
    193.164.133.120/32
  );

#tmobile    62.141.23.8/32
#vodafone    46.135.14.8/32
  if ($ok->($remote_ip)) {
    wsyslog('info', 'privileged access approved:' . $remote_ip);
    return 1;
  } else {
    wsyslog('info', 'privileged access denied:' . $remote_ip);
    return 0;
  }
}

################################################################################
sub authorized()
################################################################################
{
#  return &check_privileged_access();

  my @ok_users = (
    "https://walley.mojeid.cz/#p8sRbfdmZu",
  );

#  my $is_ok = ($user ~~ @ok_users);
  my $is_ok = ($user ne "" and $user ne "anon.openstreetmap.social");
  my $ok = ($is_ok) ? "ok" : "bad";

  wsyslog('info', "authorized(): " . $user . " is " . $ok . " from " . $remote_ip);

  return $is_ok;
}

################################################################################
sub get_user_name()
################################################################################
{
  $r->print($user);
}

################################################################################
sub login_nextcloud()
################################################################################
{
  my $client_id = $nextcloudclientid;
  my $uri_redirect = "https://cloud.grezl.eu/index.php/apps/oauth2/authorize?";
  $uri_redirect .= "response_type=code&";
  $uri_redirect .= "client_id=$client_id&";
  $uri_redirect .= "state=yo&";
  $uri_redirect .= "redirect_uri=https://api.openstreetmap.social/table/oknextcloud";

  $r->print("<html>");
  $r->print("<head>");
  $r->print("<meta http-equiv='REFRESH' content='1;url=$uri_redirect'>");
  $r->print("</head>");
  $r->print("<body>");
  $r->print("<p>this will log you in with nextcloud and send you back to landing page, ");
  $r->print("or do it <a href='$uri_redirect'>yourself</a></p>");
  $r->print("</body>");
  $r->print("</html>");
}

################################################################################
sub login_ok_nextcloud()
################################################################################
{

  my $code = shift;

  my $url = 'https://cloud.grezl.eu/index.php/apps/oauth2/api/v1/token';
  my $ua = LWP::UserAgent->new();
  my %form;
  my %oauth2_data;

  $form{'client_id'} = $nextcloudclientid;
  $form{'client_secret'} = $nextcloudclientsecret;
  $form{'code'} = $code;
  $form{'grant_type'} = 'authorization_code';
  $form{'redirect_uri'} = "http://api.openstreetmap.social/webapps/login.html";
  $form{'state'}='yo';

  my $response = $ua->post($url, \%form);
  my $content = $response->decoded_content();

  $oauth2_data = decode_json($content);

  my $acc = $oauth2_data->{access_token};
  my $error = $oauth2_data->{error};
  my $user = $oauth2_data->{user_id};

  if ($error ne "") {
    $error_result = 400;
    wsyslog("info", "400: oauth2 returned error ($error)");
    return;
  }

  if ($acc eq "") {
    $error_result = 400;
    wsyslog("info", "400: oauth2 no acc ($acc)");
    return;
  }

#  my $uri_redirect = "http://api.openstreetmap.cz/webapps/login.html";
#  $r->headers_out->set("X-AuthW" => $acc);
#  $url = "https://cloud.grezl.eu/ocs/v1.php/cloud/users/$user";
#  $ua->default_header("Authorization" => "Bearer $acc");
#  my $response = $ua->get($url);
#  my $content = $response->decoded_content();
# my $parsed = decode_json($content);

  my $oauth_user = $user;
  $oauth_user .= '@cloud.grezl.eu';

  my $sessid = $request_id."-".time();

  wsyslog("info", "login_ok_nextcloud:$oauth_user");

  $c_out = Apache2::Cookie->new($r,
             -name  => "oauth2sessid",
             -value => $sessid,
             -expires => '+10d',
  );
  $c_out->path("/");
  $c_out->bake($r);

  $query = "insert into session (acc, sessid, username) values ('$acc', '$sessid', '$oauth_user')";
  my $sth = $dbh->prepare($query);
  my $res = $sth->execute() or do {
    wsyslog("info", "500: oauth2 ok  " . $DBI::errstr . " $query");
    $error_result = 500;
    return;
  };

  $login_redirect = "http://api.openstreetmap.social/webapps/login.html";

  $r->print("<html>");
  $r->print("<head>");
  $r->print("<meta http-equiv='REFRESH' content='1;url=$login_redirect'>");
  $r->print("</head>");
  $r->print("<body>");
  $r->print("<p>login ok ....</p>");

  $r->print("<h1>~=." . $oauth_user . " .=~</h1>");

  $r->print("</body>");
  $r->print("</html>");
}


1;


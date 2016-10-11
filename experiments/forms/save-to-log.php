<?php
  $id = $_POST['message'];
  $log_file_name = 'log/'.$id.'.log';
  $out .= "id,".$id."\n";
  $out .= "time,".$_POST['date']."\n";
  $out .= "strategy,".filter_var(htmlspecialchars($_POST['strategy'], ENT_QUOTES, 'UTF-8'),FILTER_SANITIZE_STRING)."\n";
  $out .= "changes,".filter_var(htmlspecialchars($_POST['change'], ENT_QUOTES, 'UTF-8'),FILTER_SANITIZE_STRING)."\n";
  $out .= "others,".filter_var(htmlspecialchars($_POST['others'], ENT_QUOTES, 'UTF-8'),FILTER_SANITIZE_STRING)."\n";
  $out .= "relative,".filter_var(htmlspecialchars($_POST['relative'], ENT_QUOTES, 'UTF-8'),FILTER_SANITIZE_STRING)."\n";
  $out .= "bugs,".filter_var(htmlspecialchars($_POST['bugs'], ENT_QUOTES, 'UTF-8'),FILTER_SANITIZE_STRING)."\n";
  $out .= "instructions,".filter_var(htmlspecialchars($_POST['instruct'], ENT_QUOTES, 'UTF-8'),FILTER_SANITIZE_STRING)."\n";
  $out .= "fair,".filter_var(htmlspecialchars($_POST['fair'], ENT_QUOTES, 'UTF-8'),FILTER_SANITIZE_STRING)."\n";
  $out .= "comments,".filter_var(htmlspecialchars($_POST['comments'], ENT_QUOTES, 'UTF-8'),FILTER_SANITIZE_STRING)."\n";
  file_put_contents($log_file_name, $out, FILE_APPEND | LOCK_EX);
  header('Location: end.html?id='.$id);
?>
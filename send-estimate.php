<?php
declare(strict_types=1);

// Deploy on PHP-enabled Hostinger web hosting. No mailbox password is needed
// for its built-in mail transport. Never accept recipients from the browser.
const RECIPIENT = 'Cameron@tselegacytileworks.com';
const FAILURE = 'Your request could not be sent. Please try again or call (970) 556-2889.';

function respond(int $code, bool $ok, string $message): void
{
    http_response_code($code);
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    if (strpos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false) {
        header('Content-Type: application/json; charset=UTF-8');
        echo json_encode(['ok' => $ok, 'message' => $message]);
    } else {
        // Native POST remains usable with JavaScript disabled.
        header('Content-Type: text/html; charset=UTF-8');
        $title = $ok ? 'Request submitted' : 'Request not sent';
        echo '<!doctype html><html lang="en"><meta charset="utf-8">'
            . '<meta name="viewport" content="width=device-width,initial-scale=1">'
            . '<title>' . $title . ' | Legacy TileWorks</title>'
            . '<link rel="stylesheet" href="css/styles.css">'
            . '<main class="section container"><h1>' . $title . '</h1><p>'
            . htmlspecialchars($message, ENT_QUOTES, 'UTF-8')
            . '</p><p><a href="contact/#estimate">Return to the contact form</a></p>'
            . ($ok ? '' : '<p>Use your browser’s Back button to return to your entered details.</p>')
            . '</main></html>';
    }
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(405, false, 'Please submit the estimate form to send a request.');
}
if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 32768) {
    respond(413, false, 'Your request is too long. Please shorten the project details.');
}
// Reject cross-site browser submissions; native same-origin and no-JS POSTs work.
if (isset($_SERVER['HTTP_ORIGIN'])) {
    $originHost = parse_url($_SERVER['HTTP_ORIGIN'], PHP_URL_HOST);
    $requestHost = parse_url('https://' . ($_SERVER['HTTP_HOST'] ?? ''), PHP_URL_HOST);
    if (!$originHost || !$requestHost || strcasecmp($originHost, $requestHost) !== 0) {
        respond(403, false, 'Please submit your request from our contact page.');
    }
}

$limits = ['name' => 150, 'phone' => 50, 'email' => 254, 'location' => 200,
    'projectType' => 100, 'timeline' => 100, 'budget' => 100, 'details' => 10000,
    'website' => 200];
$data = [];
foreach ($limits as $field => $limit) {
    $value = $_POST[$field] ?? '';
    if (!is_string($value) || strlen($value) > $limit * 4 || strpos($value, "\0") !== false) {
        respond(422, false, 'Please check your form entries and shorten any overly long fields.');
    }
    $data[$field] = trim($value);
}
if ($data['website'] !== '') {
    respond(422, false, 'Your request could not be accepted. Please call (970) 556-2889.');
}
foreach (['name', 'phone', 'email', 'projectType', 'details'] as $field) {
    if ($data[$field] === '') {
        respond(422, false, 'Please complete all required fields.');
    }
}
if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)
    || preg_match('/[\r\n]/', $data['email'])) {
    respond(422, false, 'Please enter a valid email address.');
}
$choices = [
    'projectType' => ['Custom shower', 'Bathroom tile', 'Kitchen backsplash', 'Tile flooring',
        'Natural stone', 'Fireplace / feature wall', 'Custom design', 'Repair / restoration', 'Other'],
    'timeline' => ['', 'Not sure yet', 'As soon as available', '1–3 months', '3–6 months', '6+ months'],
    'budget' => ['', 'Prefer to discuss', 'Under $5,000', '$5,000–$10,000', '$10,000–$20,000', '$20,000–$40,000', '$40,000+']
];
foreach ($choices as $field => $values) {
    if (!in_array($data[$field], $values, true)) {
        respond(422, false, 'Please choose one of the listed project, timeline, and budget options.');
    }
}

// Limit each IP to five attempts per 15 minutes. Use a locked temporary file,
// outside the public site; do not trust client-supplied forwarding headers.
$key = hash('sha256', __DIR__ . '|' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
$limitFile = @fopen(sys_get_temp_dir() . '/tileworks-form-' . $key, 'c+');
if (!$limitFile || !flock($limitFile, LOCK_EX)) {
    respond(503, false, FAILURE);
}
$now = time();
$attempts = json_decode(stream_get_contents($limitFile), true);
$attempts = is_array($attempts) ? array_values(array_filter($attempts,
    static function ($time) use ($now) { return is_int($time) && $time > $now - 900; })) : [];
if (count($attempts) >= 5) {
    flock($limitFile, LOCK_UN);
    fclose($limitFile);
    header('Retry-After: 900');
    respond(429, false, 'Too many requests. Please wait 15 minutes or call (970) 556-2889.');
}
$attempts[] = $now;
rewind($limitFile);
ftruncate($limitFile, 0);
$saved = fwrite($limitFile, json_encode($attempts));
fflush($limitFile);
flock($limitFile, LOCK_UN);
fclose($limitFile);
if ($saved === false) {
    respond(503, false, FAILURE);
}

$body = "New estimate request from the Legacy TileWorks website\n\n";
foreach (['name' => 'Name', 'phone' => 'Phone', 'email' => 'Email', 'location' => 'Project location',
    'projectType' => 'Project type', 'timeline' => 'Timeline', 'budget' => 'Budget', 'details' => 'Project details'] as $field => $label) {
    $body .= $label . ":\n" . $data[$field] . "\n\n";
}
// The sender belongs to the site's domain. Replies go to the visitor, while
// the fixed recipient and subject prevent header injection or an open relay.
$headers = [
    'From' => 'Legacy TileWorks Website <' . RECIPIENT . '>',
    'Reply-To' => $data['email'],
    'MIME-Version' => '1.0',
    'Content-Type' => 'text/plain; charset=UTF-8',
    'Content-Transfer-Encoding' => 'base64'
];
$sent = function_exists('mail') && @mail(RECIPIENT, 'Legacy TileWorks estimate request',
    chunk_split(base64_encode($body)), $headers);
if (!$sent) {
    error_log('Legacy TileWorks estimate: mail transport did not accept the message.');
    respond(503, false, FAILURE);
}
respond(200, true, 'Thank you! Your estimate request has been submitted to Cameron.');

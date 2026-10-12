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
if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 12 * 1024 * 1024
    || ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 0 && empty($_POST) && empty($_FILES))) {
    respond(413, false, 'The upload is too large for this server. Keep attachments under 5 MB each and 10 MB total, or include sharing links.');
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


// PHP keeps uploads in temporary storage and removes them after the request.
// Do not publish uploads or trust browser-supplied MIME types/filenames.
$attachments = [];
if (array_diff(array_keys($_FILES), ['attachments'])) {
    respond(422, false, 'Please use the attachment picker on the contact page.');
}
if (isset($_FILES['attachments'])) {
    $upload = $_FILES['attachments'];
    foreach (['name', 'tmp_name', 'error', 'size'] as $key) {
        if (!isset($upload[$key]) || !is_array($upload[$key])) {
            respond(422, false, 'The attachments could not be read. Please select them again.');
        }
    }
    if (count($upload['error']) > 5) {
        respond(422, false, 'Please choose no more than 5 attachments.');
    }
    foreach (['name', 'tmp_name', 'size'] as $key) {
        if (array_keys($upload[$key]) !== array_keys($upload['error'])) {
            respond(422, false, 'The attachments could not be read. Please select them again.');
        }
    }
    $allowed = ['image/jpeg' => ['jpg', 'jpeg'], 'image/png' => ['png'],
        'image/webp' => ['webp'], 'application/pdf' => ['pdf']];
    $totalBytes = 0;
    foreach ($upload['error'] as $index => $error) {
        if (!is_int($error) || !is_string($upload['name'][$index])
            || !is_string($upload['tmp_name'][$index]) || !is_int($upload['size'][$index])) {
            respond(422, false, 'The attachments could not be read. Please select them again.');
        }
        if ($error === UPLOAD_ERR_NO_FILE) continue;
        if ($error === UPLOAD_ERR_INI_SIZE || $error === UPLOAD_ERR_FORM_SIZE) {
            respond(413, false, 'An attachment exceeds the upload limit. Use files under 5 MB or include a sharing link.');
        }
        if ($error !== UPLOAD_ERR_OK) {
            respond(422, false, 'An attachment did not finish uploading. Please select your files and try again.');
        }
        $path = $upload['tmp_name'][$index];
        if (!is_uploaded_file($path)) respond(422, false, 'Invalid attachment upload.');
        $bytes = filesize($path);
        if ($bytes === false || $bytes < 1 || $bytes > 5 * 1024 * 1024) {
            respond(413, false, 'Each attachment must contain data and be no larger than 5 MB.');
        }
        $totalBytes += $bytes;
        if ($totalBytes > 10 * 1024 * 1024) {
            respond(413, false, 'Please keep the combined attachment size at 10 MB or less.');
        }
        if (!class_exists('finfo')) {
            error_log('Legacy TileWorks estimate: PHP fileinfo extension is required for attachments.');
            respond(503, false, 'Attachments are temporarily unavailable. Remove them and include sharing links instead, or call (970) 556-2889.');
        }
        $mime = (new finfo(FILEINFO_MIME_TYPE))->file($path);
        $extension = strtolower(pathinfo($upload['name'][$index], PATHINFO_EXTENSION));
        if (!isset($allowed[$mime]) || !in_array($extension, $allowed[$mime], true)) {
            respond(422, false, 'Only genuine JPG, PNG, WebP or PDF files are accepted. Please check your attachments.');
        }
        if (strpos($mime, 'image/') === 0) {
            $image = @getimagesize($path);
            if (!$image || ($image['mime'] ?? '') !== $mime) {
                respond(422, false, 'An image attachment could not be read. Please export it as JPG, PNG or WebP.');
            }
        }
        // Generate header-safe names; untrusted original filenames never enter MIME headers.
        $attachments[] = ['path' => $path, 'mime' => $mime,
            'name' => 'project-attachment-' . (count($attachments) + 1) . '.' . $allowed[$mime][0]];
    }
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
$message = chunk_split(base64_encode($body));
if ($attachments) {
    $boundary = 'tileworks_' . bin2hex(random_bytes(18));
    $headers['Content-Type'] = 'multipart/mixed; boundary="' . $boundary . '"';
    unset($headers['Content-Transfer-Encoding']);
    $message = '--' . $boundary . "\r\n"
        . "Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n"
        . chunk_split(base64_encode($body));
    foreach ($attachments as $attachment) {
        $contents = file_get_contents($attachment['path']);
        if ($contents === false) respond(503, false, FAILURE);
        $message .= '--' . $boundary . "\r\n"
            . 'Content-Type: ' . $attachment['mime'] . "\r\n"
            . 'Content-Disposition: attachment; filename="' . $attachment['name'] . "\"\r\n"
            . "Content-Transfer-Encoding: base64\r\n\r\n"
            . chunk_split(base64_encode($contents));
    }
    $message .= '--' . $boundary . "--\r\n";
}
$sent = function_exists('mail') && @mail(RECIPIENT, 'Legacy TileWorks estimate request',
    $message, $headers);
if (!$sent) {
    error_log('Legacy TileWorks estimate: mail transport did not accept the message.');
    respond(503, false, FAILURE);
}
respond(200, true, 'Thank you! Your estimate request has been submitted to Cameron.');

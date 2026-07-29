<?php
declare(strict_types=1);
require __DIR__ . '/config.php';

function fail(string $message, int $status = 400): never {
    http_response_code($status);
    $safe = htmlspecialchars($message, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    echo '<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="assets/css/styles.css"><main class="section"><div class="container error"><h1>Order could not be submitted</h1><p>' . $safe . '</p><p><a class="button" href="javascript:history.back()">Return to the form</a></p></div></main>';
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('Use the order form to submit a request.', 405);

$packages = [
    'free' => ['name' => 'Free Portrait Preview', 'price' => 0],
    'mini' => ['name' => 'Portrait Mini', 'price' => 29],
    'studio' => ['name' => 'Studio Session', 'price' => 79],
    'creator' => ['name' => 'Brand & Creator Session', 'price' => 179],
];
$packageKey = strtolower(trim((string)($_POST['package'] ?? '')));
if (!isset($packages[$packageKey])) fail('The selected package is invalid.');
$name = trim((string)($_POST['name'] ?? ''));
$email = filter_var(trim((string)($_POST['email'] ?? '')), FILTER_VALIDATE_EMAIL);
$scene = trim((string)($_POST['scene'] ?? ''));
if ($name === '' || mb_strlen($name) > 120) fail('Enter a valid name.');
if ($email === false) fail('Enter a valid email address.');
if ($scene === '' || mb_strlen($scene) > 3000) fail('Describe the requested scene in 3,000 characters or fewer.');
foreach (['rights_confirmed','minor_consent','terms_accepted'] as $required) {
    if (($_POST[$required] ?? '') !== 'yes') fail('All required consent and policy confirmations must be accepted.');
}

$files = $_FILES['photos'] ?? null;
if (!$files || !is_array($files['name'] ?? null)) fail('Upload at least one authorized source image.');
$count = count(array_filter($files['name'], static fn($v) => (string)$v !== ''));
if ($count < 1 || $count > MAX_UPLOAD_FILES) fail('Upload between one and ' . MAX_UPLOAD_FILES . ' images.');

$orderId = 'FM-' . gmdate('Ymd-His') . '-' . strtoupper(bin2hex(random_bytes(3)));
$privateRoot = dirname((string)($_SERVER['DOCUMENT_ROOT'] ?? __DIR__)) . DIRECTORY_SEPARATOR . 'clintware_private_orders';
$orderDir = $privateRoot . DIRECTORY_SEPARATOR . $orderId;
if (!is_dir($orderDir) && !mkdir($orderDir, 0700, true) && !is_dir($orderDir)) fail('Private order storage could not be created.', 500);

$allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
$finfo = new finfo(FILEINFO_MIME_TYPE);
$saved = [];
for ($i = 0; $i < count($files['name']); $i++) {
    if (($files['error'][$i] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) continue;
    if (($files['error'][$i] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) fail('One of the uploads failed.');
    $tmp = (string)$files['tmp_name'][$i];
    $size = (int)$files['size'][$i];
    if ($size < 1 || $size > MAX_UPLOAD_BYTES) fail('Each image must be no larger than 10 MB.');
    $mime = $finfo->file($tmp);
    if (!is_string($mime) || !isset($allowed[$mime])) fail('Only JPG, PNG, and WebP images are accepted.');
    $filename = sprintf('source-%02d.%s', count($saved) + 1, $allowed[$mime]);
    if (!move_uploaded_file($tmp, $orderDir . DIRECTORY_SEPARATOR . $filename)) fail('An uploaded image could not be stored.', 500);
    $saved[] = $filename;
}
if (!$saved) fail('No valid source images were received.');

$order = [
    'order_id' => $orderId,
    'created_at_utc' => gmdate(DATE_ATOM),
    'delete_sources_by_utc' => gmdate(DATE_ATOM, time() + SOURCE_RETENTION_DAYS * 86400),
    'package_key' => $packageKey,
    'package_name' => $packages[$packageKey]['name'],
    'amount_usd' => $packages[$packageKey]['price'],
    'payment_workflow' => $packageKey === 'free' ? 'none' : PAYMENT_WORKFLOW,
    'payment_status' => $packageKey === 'free' ? 'not_required' : 'invoice_not_sent',
    'customer_name' => $name,
    'customer_email' => $email,
    'scene_request' => $scene,
    'files' => $saved,
    'consent' => ['rights_confirmed' => true, 'minor_consent' => true, 'terms_accepted' => true],
];
file_put_contents($orderDir . DIRECTORY_SEPARATOR . 'order.json', json_encode($order, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX);

$subject = '[' . $orderId . '] New Family Media order: ' . $packages[$packageKey]['name'];
$body = "Order ID: $orderId\nPackage: {$packages[$packageKey]['name']}\nAmount: $" . number_format($packages[$packageKey]['price'], 2) . "\nCustomer: $name\nEmail: $email\nPayment: {$order['payment_status']}\nPrivate folder: $orderDir\n\nScene request:\n$scene\n";
$headers = ['From: ' . STUDIO_EMAIL, 'Reply-To: ' . $email, 'Content-Type: text/plain; charset=UTF-8'];
@mail(STUDIO_EMAIL, $subject, $body, implode("\r\n", $headers));

$safeId = htmlspecialchars($orderId, ENT_QUOTES, 'UTF-8');
$paidCopy = $packageKey === 'free'
    ? 'No payment is required. Clintware will review the request and email you about the preview.'
    : 'Clintware will review the request and send the PayPal invoice to the email you provided. Production begins after the invoice is paid and verified.';
echo '<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="assets/css/styles.css"><main class="section"><div class="container success"><div class="eyebrow">Request received</div><h1>Order ' . $safeId . '</h1><p>' . htmlspecialchars($paidCopy, ENT_QUOTES, 'UTF-8') . '</p><p>Save this order reference for follow-up.</p><p><a class="button" href="index.html">Return to the studio</a></p></div></main>';

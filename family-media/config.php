<?php
declare(strict_types=1);

// Clintware Family Media Studio configuration.
// Keep this file on the server. Do not place PayPal secrets here or in browser JavaScript.
const STUDIO_EMAIL = 'studio@clintware.com';
const SELLER_NAME = 'Clintware Family Media Studio';
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_UPLOAD_FILES = 5;
const SOURCE_RETENTION_DAYS = 30;

// The default launch workflow is PayPal invoicing after manual order review.
// Direct checkout can be enabled separately in assets/js/paypal-config.js using
// PayPal-hosted Payment Link URLs; no secret key is required for those URLs.
const PAYMENT_WORKFLOW = 'paypal_invoice';

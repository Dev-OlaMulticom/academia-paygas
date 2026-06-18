<?php
/**
 * Plugin Name: Academia PayGas API
 * Plugin URI: https://academia-paygas.com
 * Description: API REST para la plataforma de aprendizaje Academia PayGas
 * Version: 2.0.0
 * Author: PayGas
 * Author URI: https://paygas.com
 * License: GPL v2 or later
 * Text Domain: academia-paygas
 * Requires at least: 6.0
 * Requires PHP: 8.0
 */

if (!defined('ABSPATH')) exit;

define('ACADEMIA_PAYGAS_VERSION', '2.0.0');
define('ACADEMIA_PAYGAS_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('ACADEMIA_PAYGAS_NAMESPACE', 'academia-paygas/v1');

// --- Autoload de clases ---
require_once ACADEMIA_PAYGAS_PLUGIN_DIR . 'includes/post-types.php';
require_once ACADEMIA_PAYGAS_PLUGIN_DIR . 'includes/meta-boxes.php';
require_once ACADEMIA_PAYGAS_PLUGIN_DIR . 'includes/class-academia-auth.php';
require_once ACADEMIA_PAYGAS_PLUGIN_DIR . 'includes/class-academia-users.php';
require_once ACADEMIA_PAYGAS_PLUGIN_DIR . 'includes/class-academia-trilhas.php';
require_once ACADEMIA_PAYGAS_PLUGIN_DIR . 'includes/class-academia-modulos.php';
require_once ACADEMIA_PAYGAS_PLUGIN_DIR . 'includes/class-academia-aulas.php';
require_once ACADEMIA_PAYGAS_PLUGIN_DIR . 'includes/class-academia-quizzes.php';
require_once ACADEMIA_PAYGAS_PLUGIN_DIR . 'includes/class-academia-certificados.php';
require_once ACADEMIA_PAYGAS_PLUGIN_DIR . 'includes/class-academia-notifications.php';
require_once ACADEMIA_PAYGAS_PLUGIN_DIR . 'includes/class-academia-docs.php';
require_once ACADEMIA_PAYGAS_PLUGIN_DIR . 'includes/class-academia-settings.php';

// --- Activar / Desactivar ---
register_activation_hook(__FILE__, function () {
    if (!get_option('academia_paygas_api_key')) {
        update_option('academia_paygas_api_key', wp_generate_password(48, false));
    }
    if (!get_option('academia_paygas_rate_limit')) {
        update_option('academia_paygas_rate_limit', 60);
    }
    if (!get_option('academia_paygas_allowed_origins')) {
        update_option('academia_paygas_allowed_origins', '');
    }
    flush_rewrite_rules();
});

register_deactivation_hook(__FILE__, function () {
    flush_rewrite_rules();
});

// --- Registrar rutas REST ---
add_action('rest_api_init', function () {
    $auth = new Academia_Auth();

    $handlers = [
        new Academia_Users($auth),
        new Academia_Trilhas($auth),
        new Academia_Modulos($auth),
        new Academia_Aulas($auth),
        new Academia_Quizzes($auth),
        new Academia_Certificados($auth),
        new Academia_Notifications($auth),
        new Academia_Docs(),
    ];

    foreach ($handlers as $handler) {
        $handler->register_routes();
    }
});

// --- CORS ---
add_action('rest_api_init', function () {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');

    add_filter('rest_pre_serve_request', function ($value) {
        $allowed_origins = get_option('academia_paygas_allowed_origins', '');
        $origins = array_filter(array_map('trim', explode("\n", $allowed_origins)));
        $origin  = $_SERVER['HTTP_ORIGIN'] ?? '';

        if (empty($origins) || in_array('*', $origins, true) || in_array($origin, $origins, true)) {
            $cors_origin = (in_array('*', $origins, true) || empty($origins)) ? '*' : $origin;
            header('Access-Control-Allow-Origin: ' . $cors_origin);
            header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type, X-API-Key');
            header('Access-Control-Max-Age: 3600');
        }

        if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
            status_header(200);
            exit;
        }

        return $value;
    }, 15);
});

// --- Admin settings ---
if (is_admin()) {
    new Academia_Settings();
}

// --- Text domain ---
add_action('init', function () {
    load_plugin_textdomain('academia-paygas', false, dirname(plugin_basename(__FILE__)) . '/languages');
});

<?php
/**
 * Plugin Name: Academia PayGas API
 * Plugin URI: https://academia-paygas.com
 * Description: Plugin para WordPress que crea Custom Post Types y REST API para la Academia PayGas
 * Version: 1.0.0
 * Author: PayGas
 * Author URI: https://paygas.com
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: academia-paygas
 * Domain Path: /languages
 */

// Evitar acceso directo
if (!defined('ABSPATH')) {
    exit;
}

// Definir constantes
define('ACADEMIA_PAYGAS_VERSION', '1.0.0');
define('ACADEMIA_PAYGAS_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('ACADEMIA_PAYGAS_PLUGIN_URL', plugin_dir_url(__FILE__));

// Incluir archivos necesarios
require_once ACADEMIA_PAYGAS_PLUGIN_DIR . 'includes/post-types.php';
require_once ACADEMIA_PAYGAS_PLUGIN_DIR . 'includes/rest-api.php';
require_once ACADEMIA_PAYGAS_PLUGIN_DIR . 'includes/meta-boxes.php';
require_once ACADEMIA_PAYGAS_PLUGIN_DIR . 'includes/documentation.php';
require_once ACADEMIA_PAYGAS_PLUGIN_DIR . 'includes/admin-page.php';

// Activar plugin
register_activation_hook(__FILE__, 'academia_paygas_activate');

function academia_paygas_activate() {
    // Registrar Custom Post Types
    academia_paygas_register_post_types();
    
    // Limpiar permalinks
    flush_rewrite_rules();
}

// Desactivar plugin
register_deactivation_hook(__FILE__, 'academia_paygas_deactivate');

function academia_paygas_deactivate() {
    // Limpiar permalinks
    flush_rewrite_rules();
}

// Inicializar plugin
add_action('init', 'academia_paygas_init');

function academia_paygas_init() {
    // Cargar text domain
    load_plugin_textdomain('academia-paygas', false, dirname(plugin_basename(__FILE__)) . '/languages');
}

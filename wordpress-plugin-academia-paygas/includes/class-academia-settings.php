<?php
if (!defined('ABSPATH')) exit;

class Academia_Settings {

    public function __construct() {
        add_action('admin_menu', [$this, 'add_menu']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_styles']);
    }

    public function add_menu(): void {
        add_menu_page(
            'Academia PayGas',
            'Academia',
            'manage_options',
            'academia-paygas',
            [$this, 'render_dashboard'],
            'dashicons-welcome-learn-more',
            30
        );

        add_submenu_page('academia-paygas', 'Dashboard', 'Dashboard', 'manage_options', 'academia-paygas', [$this, 'render_dashboard']);
        add_submenu_page('academia-paygas', 'API Settings', 'API Settings', 'manage_options', 'academia-paygas-settings', [$this, 'render_settings']);
    }

    public function enqueue_styles($hook): void {
        if (strpos($hook, 'academia-paygas') === false) return;
        ?>
        <style>
            .ap-wrap { max-width: 800px; }
            .ap-card { background: #fff; border: 1px solid #ccd0d4; border-radius: 4px; margin: 20px 0; }
            .ap-card-header { padding: 15px 20px; border-bottom: 1px solid #e2e4e7; background: #f9f9f9; border-radius: 4px 4px 0 0; }
            .ap-card-header h2 { margin: 0; font-size: 15px; font-weight: 600; }
            .ap-card-body { padding: 20px; }
            .ap-card-actions { padding: 15px 20px; border-top: 1px solid #e2e4e7; background: #f9f9f9; border-radius: 0 0 4px 4px; text-align: right; }
            .ap-api-key-display { display: flex; align-items: center; gap: 8px; }
            .ap-api-key-display input { flex: 1; font-family: monospace; font-size: 14px; padding: 6px 10px; border: 1px solid #ccd0d4; border-radius: 4px; background: #f6f7f7; }
        </style>
        <?php
    }

    public function render_dashboard(): void {
        ?>
        <div class="wrap ap-wrap">
            <h1>Academia PayGas - Dashboard</h1>
            <div class="ap-card">
                <div class="ap-card-header"><h2>Bienvenido</h2></div>
                <div class="ap-card-body">
                    <p>Plugin de API REST para la plataforma de aprendizaje Academia PayGas.</p>
                    <p>Ve a <a href="<?php echo admin_url('admin.php?page=academia-paygas-settings'); ?>">API Settings</a> para configurar tu API Key.</p>
                </div>
            </div>
        </div>
        <?php
    }

    public function render_settings(): void {
        if (isset($_POST['academia_paygas_save_settings'])) {
            check_admin_referer('academia_paygas_settings');

            if (!empty($_POST['regenerate_key'])) {
                update_option('academia_paygas_api_key', wp_generate_password(48, false));
            }

            update_option('academia_paygas_rate_limit', max(1, (int) ($_POST['rate_limit'] ?? 60)));
            update_option('academia_paygas_allowed_origins', sanitize_textarea_field($_POST['allowed_origins'] ?? ''));

            echo '<div class="notice notice-success is-dismissible"><p>Settings guardados.</p></div>';
        }

        $api_key     = get_option('academia_paygas_api_key', '');
        $rate_limit  = get_option('academia_paygas_rate_limit', 60);
        $origins     = get_option('academia_paygas_allowed_origins', '');
        $base_url    = rest_url('academia-paygas/v1');
        ?>
        <div class="wrap ap-wrap">
            <h1>API Settings</h1>

            <form method="post">
                <?php wp_nonce_field('academia_paygas_settings'); ?>

                <div class="ap-card">
                    <div class="ap-card-header"><h2>API Key</h2></div>
                    <div class="ap-card-body">
                        <p>Tu API Key (usar en header <code>X-API-Key</code>):</p>
                        <div class="ap-api-key-display">
                            <input type="text" value="<?php echo esc_attr($api_key); ?>" readonly id="ap-api-key">
                        </div>
                        <p class="description" style="margin-top: 8px;">Ejemplo: <code>curl -H "X-API-Key: <?php echo esc_html(substr($api_key, 0, 8)); ?>..." <?php echo esc_html($base_url); ?>/users</code></p>
                    </div>
                    <div class="ap-card-actions">
                        <label><input type="checkbox" name="regenerate_key" value="1"> Regenerar API Key</label>
                        <input type="submit" name="academia_paygas_save_settings" class="button button-primary" value="Guardar" style="margin-left: 12px;">
                    </div>
                </div>

                <div class="ap-card">
                    <div class="ap-card-header"><h2>Rate Limiting</h2></div>
                    <div class="ap-card-body">
                        <table class="form-table">
                            <tr>
                                <th>Max requests por minuto (por IP)</th>
                                <td><input type="number" name="rate_limit" value="<?php echo esc_attr($rate_limit); ?>" min="1" max="1000" class="small-text"></td>
                            </tr>
                        </table>
                    </div>
                </div>

                <div class="ap-card">
                    <div class="ap-card-header"><h2>CORS - Origenes Permitidos</h2></div>
                    <div class="ap-card-body">
                        <p>Un origen por linea. Dejar vacio para permitir todos.</p>
                        <textarea name="allowed_origins" rows="4" class="large-text" placeholder="https://tu-app.com"><?php echo esc_textarea($origins); ?></textarea>
                    </div>
                    <div class="ap-card-actions">
                        <input type="submit" name="academia_paygas_save_settings" class="button button-primary" value="Guardar">
                    </div>
                </div>
            </form>
        </div>
        <?php
    }
}

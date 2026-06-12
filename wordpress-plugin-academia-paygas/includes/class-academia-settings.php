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
        add_submenu_page('academia-paygas', 'API Documentation', 'API Documentation', 'manage_options', 'academia-paygas-docs', [$this, 'render_documentation']);

        // Submenus para CPTs (show_ui=false, asi que los registramos manualmente)
        add_submenu_page('academia-paygas', 'Aulas', 'Aulas', 'edit_posts', 'edit.php?post_type=ap_aula');
        add_submenu_page('academia-paygas', 'Quizzes', 'Quizzes', 'edit_posts', 'edit.php?post_type=ap_quiz');
        add_submenu_page('academia-paygas', 'Certificados', 'Certificados', 'edit_posts', 'edit.php?post_type=ap_certificate');

        // Submenus para taxonomias
        add_submenu_page('academia-paygas', 'Trilhas', 'Trilhas', 'manage_categories', 'edit-tags.php?taxonomy=ap_trilha&post_type=ap_aula');
        add_submenu_page('academia-paygas', 'Modulos', 'Modulos', 'manage_categories', 'edit-tags.php?taxonomy=ap_modulo&post_type=ap_aula');

        // Submenu Usuarios (pagia nativa de WP)
        add_submenu_page('academia-paygas', 'Usuarios', 'Usuarios', 'list_users', 'users.php');
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
        $base_url    = rest_url(ACADEMIA_PAYGAS_NAMESPACE);
        ?>
        <div class="wrap ap-wrap">
            <h1>API Settings</h1>

            <form method="post" id="ap-settings-form">
                <?php wp_nonce_field('academia_paygas_settings'); ?>

                <div class="ap-card">
                    <div class="ap-card-header"><h2>API Key</h2></div>
                    <div class="ap-card-body">
                        <?php if (empty($api_key)): ?>
                            <p>No tienes una API Key. Haz clic en "Generar" para crear una:</p>
                        <?php else: ?>
                            <p>Tu API Key (usar en header <code>X-API-Key</code>):</p>
                        <?php endif; ?>

                        <div class="ap-api-key-row">
                            <input type="text" value="<?php echo esc_attr($api_key); ?>" readonly id="ap-api-key"
                                   style="flex:1; font-family:monospace; font-size:14px; padding:8px 12px; border:1px solid #ccd0d4; border-radius:4px; background:<?php echo $api_key ? '#f6f7f7' : '#fff'; ?>;">
                            <button type="button" class="button" onclick="apCopyKey()" id="ap-copy-btn" title="Copiar">
                                <span class="dashicons dashicons-admin-page" style="margin-top:4px;"></span>
                            </button>
                            <button type="button" class="button" onclick="apToggleKeyVis()" title="Mostrar/Ocultar">
                                <span class="dashicons dashicons-visibility" style="margin-top:4px;" id="ap-eye-icon"></span>
                            </button>
                        </div>

                        <div class="ap-key-actions-row" style="margin-top:12px; display:flex; gap:8px; align-items:center;">
                            <button type="submit" name="academia_paygas_save_settings" value="1" class="button button-primary" onclick="document.getElementById('ap-regen-input').value='1'">
                                <?php echo $api_key ? 'Regenerar Key' : 'Generar Key'; ?>
                            </button>
                            <input type="hidden" name="regenerate_key" id="ap-regen-input" value="">
                            <?php if ($api_key): ?>
                                <span class="description" style="color:#646970;">Se creara una nueva key. La anterior dejara de funcionar.</span>
                            <?php endif; ?>
                        </div>

                        <?php if ($api_key): ?>
                        <div style="margin-top:16px; padding:12px; background:#f0f6fc; border-left:4px solid #2271b1; border-radius:0 4px 4px 0;">
                            <strong>Ejemplo de uso:</strong>
                            <pre style="margin:8px 0 0; background:#1d2327; color:#e6e6e6; padding:10px; border-radius:4px; font-size:12px;">curl -H "X-API-Key: YOUR_API_KEY" <?php echo esc_html($base_url); ?>/users</pre>
                            <p style="margin:8px 0 0; font-size:12px; color:#646970;">Reemplaza <code>YOUR_API_KEY</code> con tu API Key real.</p>
                        </div>
                        <?php endif; ?>
                    </div>
                </div>

                <div class="ap-card">
                    <div class="ap-card-header"><h2>Rate Limiting</h2></div>
                    <div class="ap-card-body">
                        <table class="form-table">
                            <tr>
                                <th>Max requests por minuto (por IP)</th>
                                <td>
                                    <input type="number" name="rate_limit" value="<?php echo esc_attr($rate_limit); ?>" min="1" max="1000" class="small-text">
                                    <p class="description">Ventana deslizante de 60 segundos por direccion IP.</p>
                                </td>
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
                        <input type="submit" name="academia_paygas_save_settings" class="button button-primary" value="Guardar Settings">
                    </div>
                </div>

                <div class="ap-card">
                    <div class="ap-card-header"><h2>API Documentation</h2></div>
                    <div class="ap-card-body">
                        <p>Documentación interactiva de todos los endpoints disponibles en la API de Academia PayGas.</p>
                        
                        <div style="margin: 16px 0;">
                            <a href="<?php echo esc_url(rest_url(ACADEMIA_PAYGAS_NAMESPACE . '/docs/html')); ?>" target="_blank" class="button button-primary">
                                <span class="dashicons dashicons-external" style="margin-top:4px;"></span>
                                Abrir Documentación Completa
                            </a>
                            <a href="<?php echo esc_url(rest_url(ACADEMIA_PAYGAS_NAMESPACE . '/docs/json')); ?>" target="_blank" class="button">
                                <span class="dashicons dashicons-admin-code" style="margin-top:4px;"></span>
                                Ver JSON (OpenAPI)
                            </a>
                        </div>

                        <h3 style="margin-top: 20px; margin-bottom: 12px;">Endpoints Principales</h3>
                        <table class="wp-list-table widefat fixed striped" style="margin-top: 12px;">
                            <thead>
                                <tr>
                                    <th>Método</th>
                                    <th>Ruta</th>
                                    <th>Descripción</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><span style="color:#2271b1; font-weight:bold;">GET</span></td>
                                    <td><code>/users</code></td>
                                    <td>Listar usuarios</td>
                                </tr>
                                <tr>
                                    <td><span style="color:#00a32a; font-weight:bold;">POST</span></td>
                                    <td><code>/users</code></td>
                                    <td>Crear usuario</td>
                                </tr>
                                <tr>
                                    <td><span style="color:#2271b1; font-weight:bold;">GET</span></td>
                                    <td><code>/users/me</code></td>
                                    <td>Obtener usuario autenticado</td>
                                </tr>
                                <tr>
                                    <td><span style="color:#2271b1; font-weight:bold;">GET</span></td>
                                    <td><code>/trilhas</code></td>
                                    <td>Listar trilhas</td>
                                </tr>
                                <tr>
                                    <td><span style="color:#2271b1; font-weight:bold;">GET</span></td>
                                    <td><code>/modulos</code></td>
                                    <td>Listar módulos</td>
                                </tr>
                                <tr>
                                    <td><span style="color:#2271b1; font-weight:bold;">GET</span></td>
                                    <td><code>/aulas</code></td>
                                    <td>Listar aulas</td>
                                </tr>
                                <tr>
                                    <td><span style="color:#2271b1; font-weight:bold;">GET</span></td>
                                    <td><code>/progresso/porcentagem</code></td>
                                    <td>Calcular porcentaje de progreso</td>
                                </tr>
                                <tr>
                                    <td><span style="color:#2271b1; font-weight:bold;">GET</span></td>
                                    <td><code>/certificados</code></td>
                                    <td>Listar certificados</td>
                                </tr>
                                <tr>
                                    <td><span style="color:#2271b1; font-weight:bold;">GET</span></td>
                                    <td><code>/notifications</code></td>
                                    <td>Listar notificaciones</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </form>
        </div>

        <script>
        function apCopyKey() {
            var input = document.getElementById('ap-api-key');
            var btn = document.getElementById('ap-copy-btn');
            if (!input.value) return;
            navigator.clipboard.writeText(input.value).then(function() {
                btn.innerHTML = '<span class="dashicons dashicons-saved" style="margin-top:4px; color:#00a32a;"></span>';
                setTimeout(function() { btn.innerHTML = '<span class="dashicons dashicons-admin-page" style="margin-top:4px;"></span>'; }, 2000);
            });
        }
        function apToggleKeyVis() {
            var input = document.getElementById('ap-api-key');
            var icon = document.getElementById('ap-eye-icon');
            if (input.type === 'password') {
                input.type = 'text';
                icon.className = 'dashicons dashicons-hidden';
            } else {
                input.type = 'password';
                icon.className = 'dashicons dashicons-visibility';
            }
        }
        </script>
        <?php
    }

    public function render_documentation(): void {
        $docs_url = rest_url(ACADEMIA_PAYGAS_NAMESPACE . '/docs/html');
        $json_url = rest_url(ACADEMIA_PAYGAS_NAMESPACE . '/docs/json');
        ?>
        <div class="wrap ap-wrap">
            <h1>API Documentation</h1>
            
            <div class="ap-card">
                <div class="ap-card-header">
                    <h2>Documentación de la API REST</h2>
                </div>
                <div class="ap-card-body">
                    <p>Documentación interactiva de todos los endpoints disponibles en la API de Academia PayGas.</p>
                    
                    <div style="margin: 16px 0;">
                        <a href="<?php echo esc_url($docs_url); ?>" target="_blank" class="button button-primary">
                            <span class="dashicons dashicons-external" style="margin-top:4px;"></span>
                            Abrir Documentación en Nueva Pestaña
                        </a>
                        <a href="<?php echo esc_url($json_url); ?>" target="_blank" class="button">
                            <span class="dashicons dashicons-admin-code" style="margin-top:4px;"></span>
                            Ver JSON (OpenAPI)
                        </a>
                    </div>
                    
                    <div style="margin-top: 20px; border: 1px solid #ccd0d4; border-radius: 4px; overflow: hidden;">
                        <iframe 
                            src="<?php echo esc_url($docs_url); ?>" 
                            style="width: 100%; height: 600px; border: none;"
                            title="API Documentation">
                        </iframe>
                    </div>
                </div>
            </div>
            
            <div class="ap-card">
                <div class="ap-card-header">
                    <h2>Endpoints Disponibles</h2>
                </div>
                <div class="ap-card-body">
                    <table class="wp-list-table widefat fixed striped">
                        <thead>
                            <tr>
                                <th>Método</th>
                                <th>Ruta</th>
                                <th>Descripción</th>
                                <th>Autenticación</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><span style="color:#2271b1; font-weight:bold;">GET</span></td>
                                <td><code>/users</code></td>
                                <td>Listar usuarios</td>
                                <td>✓</td>
                            </tr>
                            <tr>
                                <td><span style="color:#2271b1; font-weight:bold;">GET</span></td>
                                <td><code>/users/{id}</code></td>
                                <td>Obtener usuario por ID</td>
                                <td>✓</td>
                            </tr>
                            <tr>
                                <td><span style="color:#00a32a; font-weight:bold;">POST</span></td>
                                <td><code>/users</code></td>
                                <td>Crear usuario</td>
                                <td>✓</td>
                            </tr>
                            <tr>
                                <td><span style="color:#2271b1; font-weight:bold;">GET</span></td>
                                <td><code>/users/me</code></td>
                                <td>Obtener usuario autenticado</td>
                                <td>Cookie</td>
                            </tr>
                            <tr>
                                <td><span style="color:#2271b1; font-weight:bold;">GET</span></td>
                                <td><code>/trilhas</code></td>
                                <td>Listar trilhas</td>
                                <td>✓</td>
                            </tr>
                            <tr>
                                <td><span style="color:#2271b1; font-weight:bold;">GET</span></td>
                                <td><code>/modulos</code></td>
                                <td>Listar módulos</td>
                                <td>✓</td>
                            </tr>
                            <tr>
                                <td><span style="color:#2271b1; font-weight:bold;">GET</span></td>
                                <td><code>/aulas</code></td>
                                <td>Listar aulas</td>
                                <td>✓</td>
                            </tr>
                            <tr>
                                <td><span style="color:#2271b1; font-weight:bold;">GET</span></td>
                                <td><code>/quizzes</code></td>
                                <td>Listar quizzes</td>
                                <td>✓</td>
                            </tr>
                            <tr>
                                <td><span style="color:#2271b1; font-weight:bold;">GET</span></td>
                                <td><code>/certificados</code></td>
                                <td>Listar certificados</td>
                                <td>✓</td>
                            </tr>
                            <tr>
                                <td><span style="color:#2271b1; font-weight:bold;">GET</span></td>
                                <td><code>/notifications</code></td>
                                <td>Listar notificaciones</td>
                                <td>✓</td>
                            </tr>
                            <tr>
                                <td><span style="color:#2271b1; font-weight:bold;">GET</span></td>
                                <td><code>/progresso/porcentagem</code></td>
                                <td>Calcular porcentaje de progreso</td>
                                <td>✓</td>
                            </tr>
                            <tr>
                                <td><span style="color:#2271b1; font-weight:bold;">GET</span></td>
                                <td><code>/activity-logs</code></td>
                                <td>Listar logs de actividad</td>
                                <td>✓</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        <?php
    }
}

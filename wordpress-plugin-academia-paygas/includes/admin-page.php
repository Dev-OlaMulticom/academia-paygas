<?php
/**
 * Página de administración para Academia PayGas
 */

// Evitar acceso directo
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Agregar menú principal Academia
 */
add_action('admin_menu', 'academia_paygas_add_admin_menu');

function academia_paygas_add_admin_menu() {
    // Menú principal
    add_menu_page(
        __('Academia PayGas', 'academia-paygas'),
        __('Academia', 'academia-paygas'),
        'manage_options',
        'academia-paygas',
        'academia_paygas_admin_page',
        'dashicons-welcome-learn-more',
        30
    );
    
    // Submenú: Dashboard
    add_submenu_page(
        'academia-paygas',
        __('Dashboard', 'academia-paygas'),
        __('Dashboard', 'academia-paygas'),
        'manage_options',
        'academia-paygas',
        'academia_paygas_admin_page'
    );
    
    // Submenú: Configuraciones
    add_submenu_page(
        'academia-paygas',
        __('Configuraciones', 'academia-paygas'),
        __('Configuraciones', 'academia-paygas'),
        'manage_options',
        'academia-paygas-settings',
        'academia_paygas_settings_page'
    );
    
    // Submenú: API Keys
    add_submenu_page(
        'academia-paygas',
        __('API Keys', 'academia-paygas'),
        __('API Keys', 'academia-paygas'),
        'manage_options',
        'academia-paygas-api-keys',
        'academia_paygas_api_keys_page'
    );
    
    // Submenú: Documentación API
    add_submenu_page(
        'academia-paygas',
        __('Documentación API', 'academia-paygas'),
        __('Documentación API', 'academia-paygas'),
        'manage_options',
        'academia-paygas-docs',
        'academia_paygas_docs_page'
    );
    
    // Submenú: Aulas
    add_submenu_page(
        'academia-paygas',
        __('Aulas', 'academia-paygas'),
        __('Aulas', 'academia-paygas'),
        'edit_posts',
        'edit.php?post_type=ap_aula'
    );
    
    // Submenú: Quizzes
    add_submenu_page(
        'academia-paygas',
        __('Quizzes', 'academia-paygas'),
        __('Quizzes', 'academia-paygas'),
        'edit_posts',
        'edit.php?post_type=ap_quiz'
    );
    
    // Submenú: Certificados
    add_submenu_page(
        'academia-paygas',
        __('Certificados', 'academia-paygas'),
        __('Certificados', 'academia-paygas'),
        'edit_posts',
        'edit.php?post_type=ap_certificate'
    );
    
    // Submenú: Usuarios
    add_submenu_page(
        'academia-paygas',
        __('Usuarios', 'academia-paygas'),
        __('Usuarios', 'academia-paygas'),
        'list_users',
        'users.php'
    );
}

/**
 * Página principal Dashboard
 */
function academia_paygas_admin_page() {
    ?>
    <div class="wrap">
        <h1><?php _e('Academia PayGas - Dashboard', 'academia-paygas'); ?></h1>
        
        <div class="academia-paygas-dashboard">
            <div class="academia-paygas-cards">
                <div class="card">
                    <h2><?php _e('Estadísticas', 'academia-paygas'); ?></h2>
                    <div class="stat-item">
                        <span class="stat-number"><?php echo wp_count_posts('ap_aula')->publish; ?></span>
                        <span class="stat-label"><?php _e('Aulas', 'academia-paygas'); ?></span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number"><?php echo wp_count_posts('ap_quiz')->publish; ?></span>
                        <span class="stat-label"><?php _e('Quizzes', 'academia-paygas'); ?></span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number"><?php echo wp_count_posts('ap_certificate')->publish; ?></span>
                        <span class="stat-label"><?php _e('Certificados', 'academia-paygas'); ?></span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number"><?php echo count_users(); ?></span>
                        <span class="stat-label"><?php _e('Usuarios', 'academia-paygas'); ?></span>
                    </div>
                </div>
                
                <div class="card">
                    <h2><?php _e('Endpoints API', 'academia-paygas'); ?></h2>
                    <p><?php _e('La API REST está disponible en:', 'academia-paygas'); ?></p>
                    <code><?php echo rest_url('academia-paygas/v1'); ?></code>
                    <p><a href="<?php echo rest_url('academia-paygas/v1/docs'); ?>" target="_blank" class="button"><?php _e('Ver Documentación API', 'academia-paygas'); ?></a></p>
                </div>
                
                <div class="card">
                    <h2><?php _e('Taxonomías', 'academia-paygas'); ?></h2>
                    <div class="stat-item">
                        <span class="stat-number"><?php echo wp_count_terms('ap_trilha'); ?></span>
                        <span class="stat-label"><?php _e('Trilhas', 'academia-paygas'); ?></span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number"><?php echo wp_count_terms('ap_modulo'); ?></span>
                        <span class="stat-label"><?php _e('Módulos', 'academia-paygas'); ?></span>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <h2><?php _e('Acciones Rápidas', 'academia-paygas'); ?></h2>
                <div class="quick-actions">
                    <a href="<?php echo admin_url('post-new.php?post_type=ap_aula'); ?>" class="button button-primary"><?php _e('Crear Nueva Aula', 'academia-paygas'); ?></a>
                    <a href="<?php echo admin_url('edit-tags.php?taxonomy=ap_trilha&post_type=ap_aula'); ?>" class="button"><?php _e('Gestionar Trilhas', 'academia-paygas'); ?></a>
                    <a href="<?php echo admin_url('edit-tags.php?taxonomy=ap_modulo&post_type=ap_aula'); ?>" class="button"><?php _e('Gestionar Módulos', 'academia-paygas'); ?></a>
                    <a href="<?php echo admin_url('admin.php?page=academia-paygas-api-keys'); ?>" class="button"><?php _e('Gestionar API Keys', 'academia-paygas'); ?></a>
                </div>
            </div>
        </div>
        
        <style>
            .academia-paygas-dashboard {
                max-width: 1200px;
            }
            .academia-paygas-cards {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
                margin-bottom: 20px;
            }
            .card {
                background: #fff;
                padding: 20px;
                border: 1px solid #ccd0d4;
                box-shadow: 0 1px 1px rgba(0,0,0,.04);
            }
            .card h2 {
                margin-top: 0;
                font-size: 1.3em;
            }
            .stat-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 0;
                border-bottom: 1px solid #eee;
            }
            .stat-item:last-child {
                border-bottom: none;
            }
            .stat-number {
                font-size: 2em;
                font-weight: bold;
                color: #2271b1;
            }
            .stat-label {
                color: #646970;
            }
            .quick-actions {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }
            code {
                display: block;
                background: #f0f0f1;
                padding: 10px;
                border-radius: 4px;
                margin: 10px 0;
                word-break: break-all;
            }
        </style>
    </div>
    <?php
}

/**
 * Página de Configuraciones
 */
function academia_paygas_settings_page() {
    if (isset($_POST['academia_paygas_save_settings'])) {
        check_admin_referer('academia_paygas_settings');
        
        update_option('academia_paygas_api_enabled', isset($_POST['api_enabled']));
        update_option('academia_paygas_api_rate_limit', intval($_POST['rate_limit']));
        update_option('academia_paygas_cors_enabled', isset($_POST['cors_enabled']));
        update_option('academia_paygas_cors_origins', sanitize_textarea_field($_POST['cors_origins']));
        update_option('academia_paygas_master_api_key', sanitize_text_field($_POST['master_api_key']));
        
        echo '<div class="notice notice-success"><p>' . __('Configuraciones guardadas.', 'academia-paygas') . '</p></div>';
    }
    
    $api_enabled = get_option('academia_paygas_api_enabled', true);
    $rate_limit = get_option('academia_paygas_api_rate_limit', 100);
    $cors_enabled = get_option('academia_paygas_cors_enabled', false);
    $cors_origins = get_option('academia_paygas_cors_origins', '*');
    $master_api_key = get_option('academia_paygas_master_api_key', '');
    ?>
    <div class="wrap">
        <h1><?php _e('Configuraciones de Academia PayGas', 'academia-paygas'); ?></h1>
        
        <form method="post">
            <?php wp_nonce_field('academia_paygas_settings'); ?>
            
            <table class="form-table">
                <tr>
                    <th scope="row"><?php _e('API Habilitada', 'academia-paygas'); ?></th>
                    <td>
                        <label>
                            <input type="checkbox" name="api_enabled" value="1" <?php checked($api_enabled, true); ?>>
                            <?php _e('Habilitar API REST', 'academia-paygas'); ?>
                        </label>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><?php _e('Master API Key', 'academia-paygas'); ?></th>
                    <td>
                        <input type="text" name="master_api_key" value="<?php echo esc_attr($master_api_key); ?>" class="regular-text">
                        <p class="description"><?php _e('API key maestra para acceso sin restricciones (opcional). Si se configura, tiene prioridad sobre las API keys individuales.', 'academia-paygas'); ?></p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><?php _e('Límite de Rate', 'academia-paygas'); ?></th>
                    <td>
                        <input type="number" name="rate_limit" value="<?php echo esc_attr($rate_limit); ?>" class="small-text">
                        <p class="description"><?php _e('Solicitudes por minuto por usuario', 'academia-paygas'); ?></p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><?php _e('CORS Habilitado', 'academia-paygas'); ?></th>
                    <td>
                        <label>
                            <input type="checkbox" name="cors_enabled" value="1" <?php checked($cors_enabled, true); ?>>
                            <?php _e('Habilitar CORS', 'academia-paygas'); ?>
                        </label>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><?php _e('Orígenes CORS', 'academia-paygas'); ?></th>
                    <td>
                        <textarea name="cors_origins" rows="5" class="large-text"><?php echo esc_textarea($cors_origins); ?></textarea>
                        <p class="description"><?php _e('Un origen por línea. Use * para permitir todos.', 'academia-paygas'); ?></p>
                    </td>
                </tr>
            </table>
            
            <p class="submit">
                <input type="submit" name="academia_paygas_save_settings" class="button button-primary" value="<?php _e('Guardar Configuraciones', 'academia-paygas'); ?>">
            </p>
        </form>
    </div>
    <?php
}

/**
 * Página de API Keys
 */
function academia_paygas_api_keys_page() {
    if (isset($_POST['academia_paygas_generate_key'])) {
        check_admin_referer('academia_paygas_api_keys');
        
        $api_key = wp_generate_password(32, false);
        $user_id = intval($_POST['user_id']);
        $description = sanitize_text_field($_POST['description']);
        
        $api_keys = get_option('academia_paygas_api_keys', array());
        $api_keys[] = array(
            'key' => $api_key,
            'user_id' => $user_id,
            'description' => $description,
            'created' => current_time('mysql'),
            'last_used' => null,
        );
        
        update_option('academia_paygas_api_keys', $api_keys);
        
        echo '<div class="notice notice-success"><p>' . __('API Key generada: ', 'academia-paygas') . '<code>' . esc_html($api_key) . '</code></p></div>';
    }
    
    if (isset($_POST['academia_paygas_delete_key'])) {
        check_admin_referer('academia_paygas_api_keys');
        
        $key_index = intval($_POST['key_index']);
        $api_keys = get_option('academia_paygas_api_keys', array());
        
        if (isset($api_keys[$key_index])) {
            unset($api_keys[$key_index]);
            $api_keys = array_values($api_keys);
            update_option('academia_paygas_api_keys', $api_keys);
            echo '<div class="notice notice-success"><p>' . __('API Key eliminada.', 'academia-paygas') . '</p></div>';
        }
    }
    
    $api_keys = get_option('academia_paygas_api_keys', array());
    $users = get_users(array('role__in' => array('academia_admin', 'academia_gestor', 'academia_atendente')));
    ?>
    <div class="wrap">
        <h1><?php _e('API Keys - Academia PayGas', 'academia-paygas'); ?></h1>
        
        <div class="card" style="margin-bottom: 20px;">
            <h2><?php _e('Generar Nueva API Key', 'academia-paygas'); ?></h2>
            <form method="post">
                <?php wp_nonce_field('academia_paygas_api_keys'); ?>
                
                <table class="form-table">
                    <tr>
                        <th scope="row"><?php _e('Usuario', 'academia-paygas'); ?></th>
                        <td>
                            <select name="user_id" class="regular-text">
                                <?php foreach ($users as $user): ?>
                                    <option value="<?php echo esc_attr($user->ID); ?>"><?php echo esc_html($user->display_name); ?> (<?php echo esc_html($user->user_email); ?>)</option>
                                <?php endforeach; ?>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><?php _e('Descripción', 'academia-paygas'); ?></th>
                        <td>
                            <input type="text" name="description" class="regular-text" placeholder="<?php _e('Ej: App Móvil', 'academia-paygas'); ?>">
                        </td>
                    </tr>
                </table>
                
                <p class="submit">
                    <input type="submit" name="academia_paygas_generate_key" class="button button-primary" value="<?php _e('Generar API Key', 'academia-paygas'); ?>">
                </p>
            </form>
        </div>
        
        <div class="card">
            <h2><?php _e('API Keys Existentes', 'academia-paygas'); ?></h2>
            
            <?php if (empty($api_keys)): ?>
                <p><?php _e('No hay API keys generadas.', 'academia-paygas'); ?></p>
            <?php else: ?>
                <table class="wp-list-table widefat fixed striped">
                    <thead>
                        <tr>
                            <th><?php _e('API Key', 'academia-paygas'); ?></th>
                            <th><?php _e('Usuario', 'academia-paygas'); ?></th>
                            <th><?php _e('Descripción', 'academia-paygas'); ?></th>
                            <th><?php _e('Creada', 'academia-paygas'); ?></th>
                            <th><?php _e('Último Uso', 'academia-paygas'); ?></th>
                            <th><?php _e('Acciones', 'academia-paygas'); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($api_keys as $index => $key_data): ?>
                            <?php $user = get_user_by('id', $key_data['user_id']); ?>
                            <tr>
                                <td><code><?php echo esc_html(substr($key_data['key'], 0, 8)) . '...' . esc_html(substr($key_data['key'], -8)); ?></code></td>
                                <td><?php echo $user ? esc_html($user->display_name) : __('Usuario eliminado', 'academia-paygas'); ?></td>
                                <td><?php echo esc_html($key_data['description']); ?></td>
                                <td><?php echo esc_html($key_data['created']); ?></td>
                                <td><?php echo $key_data['last_used'] ? esc_html($key_data['last_used']) : __('Nunca', 'academia-paygas'); ?></td>
                                <td>
                                    <form method="post" style="display: inline;">
                                        <?php wp_nonce_field('academia_paygas_api_keys'); ?>
                                        <input type="hidden" name="key_index" value="<?php echo esc_attr($index); ?>">
                                        <input type="submit" name="academia_paygas_delete_key" class="button button-small" value="<?php _e('Eliminar', 'academia-paygas'); ?>" onclick="return confirm('<?php _e('¿Estás seguro de eliminar esta API Key?', 'academia-paygas'); ?>');">
                                    </form>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </div>
        
        <div class="card" style="margin-top: 20px;">
            <h2><?php _e('Cómo usar las API Keys', 'academia-paygas'); ?></h2>
            <p><?php _e('Para usar las API Keys, incluye el header X-API-Key en tus solicitudes:', 'academia-paygas'); ?></p>
            <pre><code>curl -H "X-API-Key: tu-api-key-aqui" <?php echo rest_url('academia-paygas/v1/users'); ?></code></pre>
        </div>
    </div>
    <?php
}

/**
 * Página de Documentación API
 */
function academia_paygas_docs_page() {
    $api_spec = academia_paygas_get_api_spec();
    ?>
    <div class="wrap">
        <h1><?php _e('Documentación API - Academia PayGas', 'academia-paygas'); ?></h1>
        
        <div class="card">
            <h2><?php _e('Información General', 'academia-paygas'); ?></h2>
            <p><strong><?php _e('Base URL:', 'academia-paygas'); ?></strong> <code><?php echo rest_url('academia-paygas/v1'); ?></code></p>
            <p><strong><?php _e('Versión:', 'academia-paygas'); ?></strong> <?php echo esc_html($api_spec['info']['version']); ?></p>
            <p><strong><?php _e('Autenticación:', 'academia-paygas'); ?></strong> <?php echo esc_html($api_spec['authentication']['description']); ?></p>
        </div>
        
        <div class="card" style="margin-top: 20px;">
            <h2><?php _e('Endpoints Disponibles', 'academia-paygas'); ?></h2>
            
            <table class="wp-list-table widefat fixed striped">
                <thead>
                    <tr>
                        <th><?php _e('Método', 'academia-paygas'); ?></th>
                        <th><?php _e('Endpoint', 'academia-paygas'); ?></th>
                        <th><?php _e('Descripción', 'academia-paygas'); ?></th>
                        <th><?php _e('Permisos', 'academia-paygas'); ?></th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($api_spec['endpoints'] as $endpoint): ?>
                        <tr>
                            <td><span class="method-badge method-<?php echo strtolower($endpoint['method']); ?>"><?php echo esc_html($endpoint['method']); ?></span></td>
                            <td><code><?php echo esc_html($endpoint['path']); ?></code></td>
                            <td><?php echo esc_html($endpoint['summary']); ?></td>
                            <td><?php echo esc_html($endpoint['permission']); ?></td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        
        <div class="card" style="margin-top: 20px;">
            <h2><?php _e('Roles y Permisos', 'academia-paygas'); ?></h2>
            <?php foreach ($api_spec['roles'] as $role => $role_info): ?>
                <h3><?php echo esc_html($role); ?></h3>
                <p><?php echo esc_html($role_info['description']); ?></p>
                <p><strong><?php _e('Permisos:', 'academia-paygas'); ?></strong> <?php echo esc_html(implode(', ', $role_info['permissions'])); ?></p>
            <?php endforeach; ?>
        </div>
        
        <div class="card" style="margin-top: 20px;">
            <h2><?php _e('Custom Post Types', 'academia-paygas'); ?></h2>
            <ul>
                <?php foreach ($api_spec['custom_post_types'] as $cpt => $cpt_info): ?>
                    <li><strong><?php echo esc_html($cpt); ?></strong> - <?php echo esc_html($cpt_info['description']); ?></li>
                <?php endforeach; ?>
            </ul>
        </div>
        
        <div class="card" style="margin-top: 20px;">
            <h2><?php _e('Ejemplo de Uso', 'academia-paygas'); ?></h2>
            <pre><code>// Obtener todas las trilhas
curl <?php echo rest_url('academia-paygas/v1/trilhas'); ?>

// Crear un nuevo usuario
curl -X POST <?php echo rest_url('academia-paygas/v1/users'); ?> \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@ejemplo.com",
    "nome": "Juan Pérez",
    "senha": "password123",
    "role": "academia_atendente"
  }'</code></pre>
        </div>
        
        <style>
            .method-badge {
                display: inline-block;
                padding: 4px 8px;
                border-radius: 4px;
                font-weight: bold;
                font-size: 12px;
            }
            .method-get { background: #61affe; color: white; }
            .method-post { background: #49cc90; color: white; }
            .method-put { background: #fca130; color: white; }
            .method-delete { background: #f93e3e; color: white; }
            pre {
                background: #f0f0f1;
                padding: 15px;
                border-radius: 4px;
                overflow-x: auto;
            }
            code {
                background: #f0f0f1;
                padding: 2px 6px;
                border-radius: 3px;
            }
        </style>
    </div>
    <?php
}

/**
 * Verificar API Key en requests REST
 */
add_action('rest_api_init', 'academia_paygas_add_api_key_authentication');

function academia_paygas_add_api_key_authentication() {
    add_filter('rest_authentication_errors', 'academia_paygas_api_key_authenticate', 10);
}

function academia_paygas_api_key_authenticate($result) {
    // Si ya hay un error, retornarlo
    if (!empty($result)) {
        return $result;
    }
    
    // Verificar si está deshabilitado
    if (!get_option('academia_paygas_api_enabled', true)) {
        return new WP_Error('api_disabled', __('API deshabilitada', 'academia-paygas'), array('status' => 503));
    }
    
    // Verificar API Key
    $api_key = isset($_SERVER['HTTP_X_API_KEY']) ? $_SERVER['HTTP_X_API_KEY'] : '';
    
    if (empty($api_key)) {
        // Si no hay API key, usar autenticación de WordPress normal
        return $result;
    }
    
    // Primero verificar si es la master API key (configurable en opciones)
    $master_key = get_option('academia_paygas_master_api_key', '');
    if ($api_key === $master_key && !empty($master_key)) {
        // Master key válida - usar usuario admin por defecto
        $admin_users = get_users(array('role' => 'administrator', 'number' => 1));
        if (!empty($admin_users)) {
            wp_set_current_user($admin_users[0]->ID);
        }
        return $result;
    }
    
    $api_keys = get_option('academia_paygas_api_keys', array());
    $valid_key = false;
    $user_id = null;
    
    foreach ($api_keys as $key_data) {
        if ($key_data['key'] === $api_key) {
            $valid_key = true;
            $user_id = $key_data['user_id'];
            
            // Actualizar último uso
            $key_data['last_used'] = current_time('mysql');
            break;
        }
    }
    
    if (!$valid_key) {
        return new WP_Error('invalid_api_key', __('API Key inválida', 'academia-paygas'), array('status' => 401));
    }
    
    // Establecer el usuario actual
    if ($user_id) {
        wp_set_current_user($user_id);
    }
    
    return $result;
}

/**
 * Agregar headers CORS si está habilitado
 */
add_action('rest_api_init', 'academia_paygas_add_cors_headers');

function academia_paygas_add_cors_headers() {
    if (!get_option('academia_paygas_cors_enabled', false)) {
        return;
    }
    
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
    add_filter('rest_pre_serve_request', function($value) {
        $origins = get_option('academia_paygas_cors_origins', '*');
        $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
        
        if ($origins === '*') {
            header('Access-Control-Allow-Origin: *');
        } else {
            $allowed_origins = array_filter(array_map('trim', explode("\n", $origins)));
            if (in_array($origin, $allowed_origins)) {
                header('Access-Control-Allow-Origin: ' . $origin);
            }
        }
        
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Max-Age: 86400');
        
        return $value;
    });
}

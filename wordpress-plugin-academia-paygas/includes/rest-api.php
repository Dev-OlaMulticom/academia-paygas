<?php
/**
 * REST API para Academia PayGas
 */

// Evitar acceso directo
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Registrar rutas de la REST API
 */
add_action('rest_api_init', 'academia_paygas_register_rest_routes');

function academia_paygas_register_rest_routes() {
    // Users endpoints
    register_rest_route('academia-paygas/v1', '/users', array(
        'methods' => 'GET',
        'callback' => 'academia_paygas_get_users',
        'permission_callback' => 'academia_paygas_check_permission',
    ));
    
    register_rest_route('academia-paygas/v1', '/users/(?P<id>\d+)', array(
        'methods' => 'GET',
        'callback' => 'academia_paygas_get_user',
        'permission_callback' => 'academia_paygas_check_permission',
    ));
    
    register_rest_route('academia-paygas/v1', '/users', array(
        'methods' => 'POST',
        'callback' => 'academia_paygas_create_user',
        'permission_callback' => 'academia_paygas_check_permission',
    ));
    
    register_rest_route('academia-paygas/v1', '/users/(?P<id>\d+)', array(
        'methods' => 'PUT',
        'callback' => 'academia_paygas_update_user',
        'permission_callback' => 'academia_paygas_check_permission',
    ));
    
    register_rest_route('academia-paygas/v1', '/users/(?P<id>\d+)', array(
        'methods' => 'DELETE',
        'callback' => 'academia_paygas_delete_user',
        'permission_callback' => 'academia_paygas_check_permission',
    ));
    
    // Trilhas endpoints
    register_rest_route('academia-paygas/v1', '/trilhas', array(
        'methods' => 'GET',
        'callback' => 'academia_paygas_get_trilhas',
        'permission_callback' => 'academia_paygas_check_permission',
    ));
    
    register_rest_route('academia-paygas/v1', '/trilhas/(?P<id>\d+)', array(
        'methods' => 'GET',
        'callback' => 'academia_paygas_get_trilha',
        'permission_callback' => 'academia_paygas_check_permission',
    ));
    
    register_rest_route('academia-paygas/v1', '/trilhas', array(
        'methods' => 'POST',
        'callback' => 'academia_paygas_create_trilha',
        'permission_callback' => 'academia_paygas_check_permission',
    ));
    
    register_rest_route('academia-paygas/v1', '/trilhas/(?P<id>\d+)', array(
        'methods' => 'PUT',
        'callback' => 'academia_paygas_update_trilha',
        'permission_callback' => 'academia_paygas_check_permission',
    ));
    
    register_rest_route('academia-paygas/v1', '/trilhas/(?P<id>\d+)', array(
        'methods' => 'DELETE',
        'callback' => 'academia_paygas_delete_trilha',
        'permission_callback' => 'academia_paygas_check_permission',
    ));
    
    // Modulos endpoints
    register_rest_route('academia-paygas/v1', '/modulos', array(
        'methods' => 'GET',
        'callback' => 'academia_paygas_get_modulos',
        'permission_callback' => 'academia_paygas_check_permission',
    ));
    
    register_rest_route('academia-paygas/v1', '/modulos/(?P<id>\d+)', array(
        'methods' => 'GET',
        'callback' => 'academia_paygas_get_modulo',
        'permission_callback' => 'academia_paygas_check_permission',
    ));
    
    register_rest_route('academia-paygas/v1', '/modulos', array(
        'methods' => 'POST',
        'callback' => 'academia_paygas_create_modulo',
        'permission_callback' => 'academia_paygas_check_permission',
    ));
    
    register_rest_route('academia-paygas/v1', '/modulos/(?P<id>\d+)', array(
        'methods' => 'PUT',
        'callback' => 'academia_paygas_update_modulo',
        'permission_callback' => 'academia_paygas_check_permission',
    ));
    
    register_rest_route('academia-paygas/v1', '/modulos/(?P<id>\d+)', array(
        'methods' => 'DELETE',
        'callback' => 'academia_paygas_delete_modulo',
        'permission_callback' => 'academia_paygas_check_permission',
    ));
    
    // Aulas endpoints
    register_rest_route('academia-paygas/v1', '/aulas', array(
        'methods' => 'GET',
        'callback' => 'academia_paygas_get_aulas',
        'permission_callback' => 'academia_paygas_check_permission',
    ));
    
    register_rest_route('academia-paygas/v1', '/aulas/(?P<id>\d+)', array(
        'methods' => 'GET',
        'callback' => 'academia_paygas_get_aula',
        'permission_callback' => 'academia_paygas_check_permission',
    ));
    
    register_rest_route('academia-paygas/v1', '/aulas', array(
        'methods' => 'POST',
        'callback' => 'academia_paygas_create_aula',
        'permission_callback' => 'academia_paygas_check_permission',
    ));
    
    register_rest_route('academia-paygas/v1', '/aulas/(?P<id>\d+)', array(
        'methods' => 'PUT',
        'callback' => 'academia_paygas_update_aula',
        'permission_callback' => 'academia_paygas_check_permission',
    ));
    
    register_rest_route('academia-paygas/v1', '/aulas/(?P<id>\d+)', array(
        'methods' => 'DELETE',
        'callback' => 'academia_paygas_delete_aula',
        'permission_callback' => 'academia_paygas_check_permission',
    ));
    
    // Quiz endpoints
    register_rest_route('academia-paygas/v1', '/quizzes', array(
        'methods' => 'GET',
        'callback' => 'academia_paygas_get_quizzes',
        'permission_callback' => 'academia_paygas_check_permission',
    ));
    
    register_rest_route('academia-paygas/v1', '/quizzes/(?P<id>\d+)', array(
        'methods' => 'GET',
        'callback' => 'academia_paygas_get_quiz',
        'permission_callback' => 'academia_paygas_check_permission',
    ));
    
    register_rest_route('academia-paygas/v1', '/quizzes', array(
        'methods' => 'POST',
        'callback' => 'academia_paygas_create_quiz',
        'permission_callback' => 'academia_paygas_check_permission',
    ));
    
    register_rest_route('academia-paygas/v1', '/quizzes/(?P<id>\d+)', array(
        'methods' => 'PUT',
        'callback' => 'academia_paygas_update_quiz',
        'permission_callback' => 'academia_paygas_check_permission',
    ));
    
    register_rest_route('academia-paygas/v1', '/quizzes/(?P<id>\d+)', array(
        'methods' => 'DELETE',
        'callback' => 'academia_paygas_delete_quiz',
        'permission_callback' => 'academia_paygas_check_permission',
    ));
    
    // Quiz Response endpoints
    register_rest_route('academia-paygas/v1', '/quiz-responses', array(
        'methods' => 'GET',
        'callback' => 'academia_paygas_get_quiz_responses',
        'permission_callback' => 'academia_paygas_check_permission',
    ));
    
    register_rest_route('academia-paygas/v1', '/quiz-responses', array(
        'methods' => 'POST',
        'callback' => 'academia_paygas_create_quiz_response',
        'permission_callback' => 'academia_paygas_check_permission',
    ));
    
    // Progresso endpoints
    register_rest_route('academia-paygas/v1', '/progresso', array(
        'methods' => 'GET',
        'callback' => 'academia_paygas_get_progresso',
        'permission_callback' => 'academia_paygas_check_permission',
    ));
    
    register_rest_route('academia-paygas/v1', '/progresso', array(
        'methods' => 'POST',
        'callback' => 'academia_paygas_create_progresso',
        'permission_callback' => 'academia_paygas_check_permission',
    ));
    
    register_rest_route('academia-paygas/v1', '/progresso/(?P<id>\d+)', array(
        'methods' => 'PUT',
        'callback' => 'academia_paygas_update_progresso',
        'permission_callback' => 'academia_paygas_check_permission',
    ));
    
    // Certificados endpoints
    register_rest_route('academia-paygas/v1', '/certificados', array(
        'methods' => 'GET',
        'callback' => 'academia_paygas_get_certificados',
        'permission_callback' => 'academia_paygas_check_permission',
    ));
    
    register_rest_route('academia-paygas/v1', '/certificados/(?P<id>\d+)', array(
        'methods' => 'GET',
        'callback' => 'academia_paygas_get_certificado',
        'permission_callback' => 'academia_paygas_check_permission',
    ));
    
    register_rest_route('academia-paygas/v1', '/certificados', array(
        'methods' => 'POST',
        'callback' => 'academia_paygas_create_certificado',
        'permission_callback' => 'academia_paygas_check_permission',
    ));
    
    register_rest_route('academia-paygas/v1', '/certificados/(?P<id>\d+)', array(
        'methods' => 'PUT',
        'callback' => 'academia_paygas_update_certificado',
        'permission_callback' => 'academia_paygas_check_permission',
    ));
    
    // Notifications endpoints
    register_rest_route('academia-paygas/v1', '/notifications', array(
        'methods' => 'GET',
        'callback' => 'academia_paygas_get_notifications',
        'permission_callback' => 'academia_paygas_check_permission',
    ));
    
    register_rest_route('academia-paygas/v1', '/notifications', array(
        'methods' => 'POST',
        'callback' => 'academia_paygas_create_notification',
        'permission_callback' => 'academia_paygas_check_permission',
    ));
    
    register_rest_route('academia-paygas/v1', '/notifications/(?P<id>\d+)', array(
        'methods' => 'PUT',
        'callback' => 'academia_paygas_update_notification',
        'permission_callback' => 'academia_paygas_check_permission',
    ));
    
    // Activity Log endpoints
    register_rest_route('academia-paygas/v1', '/activity-logs', array(
        'methods' => 'GET',
        'callback' => 'academia_paygas_get_activity_logs',
        'permission_callback' => 'academia_paygas_check_permission',
    ));
    
    register_rest_route('academia-paygas/v1', '/activity-logs', array(
        'methods' => 'POST',
        'callback' => 'academia_paygas_create_activity_log',
        'permission_callback' => 'academia_paygas_check_permission',
    ));
    
    // Trilha Atendente endpoints
    register_rest_route('academia-paygas/v1', '/trilha-atendente', array(
        'methods' => 'GET',
        'callback' => 'academia_paygas_get_trilha_atendente',
        'permission_callback' => 'academia_paygas_check_permission',
    ));
    
    register_rest_route('academia-paygas/v1', '/trilha-atendente', array(
        'methods' => 'POST',
        'callback' => 'academia_paygas_create_trilha_atendente',
        'permission_callback' => 'academia_paygas_check_permission',
    ));
    
    register_rest_route('academia-paygas/v1', '/trilha-atendente/(?P<id>\d+)', array(
        'methods' => 'DELETE',
        'callback' => 'academia_paygas_delete_trilha_atendente',
        'permission_callback' => 'academia_paygas_check_permission',
    ));
}

/**
 * Verificar permisos
 */
function academia_paygas_check_permission() {
    return current_user_can('read');
}

/**
 * USERS CRUD
 */
function academia_paygas_get_users($request) {
    $args = array(
        'role__in' => array('academia_admin', 'academia_gestor', 'academia_atendente'),
        'numberposts' => -1,
    );
    
    $users = get_users($args);
    $data = array();
    
    foreach ($users as $user) {
        $data[] = array(
            'id' => $user->ID,
            'email' => $user->user_email,
            'nome' => $user->display_name,
            'role' => $user->roles[0] ?? '',
            'gestorId' => get_user_meta($user->ID, '_ap_gestor_id', true),
            'createdAt' => $user->user_registered,
            'lastLogin' => get_user_meta($user->ID, '_ap_last_login', true),
        );
    }
    
    return rest_ensure_response($data);
}

function academia_paygas_get_user($request) {
    $user_id = $request['id'];
    $user = get_user_by('id', $user_id);
    
    if (!$user) {
        return new WP_Error('user_not_found', __('Usuario no encontrado', 'academia-paygas'), array('status' => 404));
    }
    
    $data = array(
        'id' => $user->ID,
        'email' => $user->user_email,
        'nome' => $user->display_name,
        'role' => $user->roles[0] ?? '',
        'gestorId' => get_user_meta($user->ID, '_ap_gestor_id', true),
        'createdAt' => $user->user_registered,
        'lastLogin' => get_user_meta($user->ID, '_ap_last_login', true),
    );
    
    return rest_ensure_response($data);
}

function academia_paygas_create_user($request) {
    $params = $request->get_json_params();
    
    $user_id = wp_create_user($params['email'], $params['senha'], $params['email']);
    
    if (is_wp_error($user_id)) {
        return $user_id;
    }
    
    $user = get_user_by('id', $user_id);
    $user->display_name = $params['nome'];
    wp_update_user($user);
    
    // Asignar rol
    $user->set_role($params['role']);
    
    // Guardar gestorId si existe
    if (isset($params['gestorId'])) {
        update_user_meta($user_id, '_ap_gestor_id', intval($params['gestorId']));
    }
    
    $data = array(
        'id' => $user_id,
        'email' => $params['email'],
        'nome' => $params['nome'],
        'role' => $params['role'],
        'gestorId' => $params['gestorId'] ?? null,
        'createdAt' => current_time('mysql'),
    );
    
    return rest_ensure_response($data);
}

function academia_paygas_update_user($request) {
    $user_id = $request['id'];
    $params = $request->get_json_params();
    
    $user = get_user_by('id', $user_id);
    
    if (!$user) {
        return new WP_Error('user_not_found', __('Usuario no encontrado', 'academia-paygas'), array('status' => 404));
    }
    
    if (isset($params['nome'])) {
        $user->display_name = $params['nome'];
    }
    
    if (isset($params['email'])) {
        $user->user_email = $params['email'];
    }
    
    if (isset($params['senha'])) {
        wp_set_password($params['senha'], $user_id);
    }
    
    if (isset($params['role'])) {
        $user->set_role($params['role']);
    }
    
    if (isset($params['gestorId'])) {
        update_user_meta($user_id, '_ap_gestor_id', intval($params['gestorId']));
    }
    
    wp_update_user($user);
    
    $data = array(
        'id' => $user_id,
        'email' => $user->user_email,
        'nome' => $user->display_name,
        'role' => $user->roles[0] ?? '',
        'gestorId' => get_user_meta($user_id, '_ap_gestor_id', true),
        'createdAt' => $user->user_registered,
    );
    
    return rest_ensure_response($data);
}

function academia_paygas_delete_user($request) {
    $user_id = $request['id'];
    
    if (wp_delete_user($user_id)) {
        return rest_ensure_response(array('message' => __('Usuario eliminado', 'academia-paygas')));
    }
    
    return new WP_Error('delete_failed', __('Error al eliminar usuario', 'academia-paygas'), array('status' => 500));
}

/**
 * TRILHAS CRUD (ahora trabaja con taxonomía)
 */
function academia_paygas_get_trilhas($request) {
    $terms = get_terms(array(
        'taxonomy' => 'ap_trilha',
        'hide_empty' => false,
    ));
    
    $data = array();
    
    foreach ($terms as $term) {
        $data[] = array(
            'id' => $term->term_id,
            'titulo' => $term->name,
            'descricao' => $term->description,
            'icon' => get_term_meta($term->term_id, '_ap_trilha_icon', true),
            'color' => get_term_meta($term->term_id, '_ap_trilha_color', true),
            'obrigatorio' => get_term_meta($term->term_id, '_ap_trilha_obrigatorio', true) === '1',
            'count' => $term->count,
        );
    }
    
    return rest_ensure_response($data);
}

function academia_paygas_get_trilha($request) {
    $term_id = $request['id'];
    $term = get_term($term_id, 'ap_trilha');
    
    if (!$term || is_wp_error($term)) {
        return new WP_Error('trilha_not_found', __('Trilha no encontrada', 'academia-paygas'), array('status' => 404));
    }
    
    $data = array(
        'id' => $term->term_id,
        'titulo' => $term->name,
        'descricao' => $term->description,
        'icon' => get_term_meta($term->term_id, '_ap_trilha_icon', true),
        'color' => get_term_meta($term->term_id, '_ap_trilha_color', true),
        'obrigatorio' => get_term_meta($term->term_id, '_ap_trilha_obrigatorio', true) === '1',
        'count' => $term->count,
    );
    
    return rest_ensure_response($data);
}

function academia_paygas_create_trilha($request) {
    $params = $request->get_json_params();
    
    $term = wp_insert_term($params['titulo'], 'ap_trilha', array(
        'description' => $params['descricao'] ?? '',
    ));
    
    if (is_wp_error($term)) {
        return $term;
    }
    
    $term_id = $term['term_id'];
    
    if (isset($params['icon'])) {
        update_term_meta($term_id, '_ap_trilha_icon', sanitize_text_field($params['icon']));
    }
    
    if (isset($params['color'])) {
        update_term_meta($term_id, '_ap_trilha_color', sanitize_hex_color($params['color']));
    }
    
    if (isset($params['obrigatorio'])) {
        update_term_meta($term_id, '_ap_trilha_obrigatorio', $params['obrigatorio'] ? '1' : '0');
    }
    
    $data = array(
        'id' => $term_id,
        'titulo' => $params['titulo'],
        'descricao' => $params['descricao'] ?? '',
        'icon' => $params['icon'] ?? '',
        'color' => $params['color'] ?? '',
        'obrigatorio' => $params['obrigatorio'] ?? false,
    );
    
    return rest_ensure_response($data);
}

function academia_paygas_update_trilha($request) {
    $term_id = $request['id'];
    $params = $request->get_json_params();
    
    $term = get_term($term_id, 'ap_trilha');
    
    if (!$term || is_wp_error($term)) {
        return new WP_Error('trilha_not_found', __('Trilha no encontrada', 'academia-paygas'), array('status' => 404));
    }
    
    $update_args = array();
    
    if (isset($params['titulo'])) {
        $update_args['name'] = $params['titulo'];
    }
    
    if (isset($params['descricao'])) {
        $update_args['description'] = $params['descricao'];
    }
    
    if (!empty($update_args)) {
        wp_update_term($term_id, 'ap_trilha', $update_args);
    }
    
    if (isset($params['icon'])) {
        update_term_meta($term_id, '_ap_trilha_icon', sanitize_text_field($params['icon']));
    }
    
    if (isset($params['color'])) {
        update_term_meta($term_id, '_ap_trilha_color', sanitize_hex_color($params['color']));
    }
    
    if (isset($params['obrigatorio'])) {
        update_term_meta($term_id, '_ap_trilha_obrigatorio', $params['obrigatorio'] ? '1' : '0');
    }
    
    $term = get_term($term_id, 'ap_trilha');
    
    $data = array(
        'id' => $term->term_id,
        'titulo' => $term->name,
        'descricao' => $term->description,
        'icon' => get_term_meta($term_id, '_ap_trilha_icon', true),
        'color' => get_term_meta($term_id, '_ap_trilha_color', true),
        'obrigatorio' => get_term_meta($term_id, '_ap_trilha_obrigatorio', true) === '1',
    );
    
    return rest_ensure_response($data);
}

function academia_paygas_delete_trilha($request) {
    $term_id = $request['id'];
    
    $result = wp_delete_term($term_id, 'ap_trilha');
    
    if (is_wp_error($result)) {
        return $result;
    }
    
    if ($result !== false) {
        return rest_ensure_response(array('message' => __('Trilha eliminada', 'academia-paygas')));
    }
    
    return new WP_Error('delete_failed', __('Error al eliminar trilha', 'academia-paygas'), array('status' => 500));
}

/**
 * MODULOS CRUD (ahora trabaja con taxonomía)
 */
function academia_paygas_get_modulos($request) {
    $trilha_id = $request->get_param('trilha_id');
    
    $args = array(
        'taxonomy' => 'ap_modulo',
        'hide_empty' => false,
    );
    
    if ($trilha_id) {
        $args['meta_query'] = array(
            array(
                'key' => '_ap_modulo_trilha_id',
                'value' => $trilha_id,
            ),
        );
    }
    
    $terms = get_terms($args);
    $data = array();
    
    foreach ($terms as $term) {
        $data[] = array(
            'id' => $term->term_id,
            'trilhaId' => get_term_meta($term->term_id, '_ap_modulo_trilha_id', true),
            'titulo' => $term->name,
            'descricao' => $term->description,
            'ordem' => get_term_meta($term->term_id, '_ap_modulo_ordem', true),
            'videoUrl' => get_term_meta($term->term_id, '_ap_modulo_video_url', true),
            'videoInicio' => get_term_meta($term->term_id, '_ap_modulo_video_inicio', true),
            'videoFim' => get_term_meta($term->term_id, '_ap_modulo_video_fim', true),
            'count' => $term->count,
        );
    }
    
    return rest_ensure_response($data);
}

function academia_paygas_get_modulo($request) {
    $term_id = $request['id'];
    $term = get_term($term_id, 'ap_modulo');
    
    if (!$term || is_wp_error($term)) {
        return new WP_Error('modulo_not_found', __('Módulo no encontrado', 'academia-paygas'), array('status' => 404));
    }
    
    $data = array(
        'id' => $term->term_id,
        'trilhaId' => get_term_meta($term->term_id, '_ap_modulo_trilha_id', true),
        'titulo' => $term->name,
        'descricao' => $term->description,
        'ordem' => get_term_meta($term->term_id, '_ap_modulo_ordem', true),
        'videoUrl' => get_term_meta($term->term_id, '_ap_modulo_video_url', true),
        'videoInicio' => get_term_meta($term->term_id, '_ap_modulo_video_inicio', true),
        'videoFim' => get_term_meta($term->term_id, '_ap_modulo_video_fim', true),
        'count' => $term->count,
    );
    
    return rest_ensure_response($data);
}

function academia_paygas_create_modulo($request) {
    $params = $request->get_json_params();
    
    $term = wp_insert_term($params['titulo'], 'ap_modulo', array(
        'description' => $params['descricao'] ?? '',
    ));
    
    if (is_wp_error($term)) {
        return $term;
    }
    
    $term_id = $term['term_id'];
    
    if (isset($params['trilhaId'])) {
        update_term_meta($term_id, '_ap_modulo_trilha_id', intval($params['trilhaId']));
    }
    
    if (isset($params['ordem'])) {
        update_term_meta($term_id, '_ap_modulo_ordem', intval($params['ordem']));
    }
    
    if (isset($params['videoUrl'])) {
        update_term_meta($term_id, '_ap_modulo_video_url', esc_url_raw($params['videoUrl']));
    }
    
    if (isset($params['videoInicio'])) {
        update_term_meta($term_id, '_ap_modulo_video_inicio', intval($params['videoInicio']));
    }
    
    if (isset($params['videoFim'])) {
        update_term_meta($term_id, '_ap_modulo_video_fim', intval($params['videoFim']));
    }
    
    $data = array(
        'id' => $term_id,
        'trilhaId' => $params['trilhaId'] ?? null,
        'titulo' => $params['titulo'],
        'descricao' => $params['descricao'] ?? '',
        'ordem' => $params['ordem'] ?? 0,
        'videoUrl' => $params['videoUrl'] ?? '',
        'videoInicio' => $params['videoInicio'] ?? null,
        'videoFim' => $params['videoFim'] ?? null,
    );
    
    return rest_ensure_response($data);
}

function academia_paygas_update_modulo($request) {
    $term_id = $request['id'];
    $params = $request->get_json_params();
    
    $term = get_term($term_id, 'ap_modulo');
    
    if (!$term || is_wp_error($term)) {
        return new WP_Error('modulo_not_found', __('Módulo no encontrado', 'academia-paygas'), array('status' => 404));
    }
    
    $update_args = array();
    
    if (isset($params['titulo'])) {
        $update_args['name'] = $params['titulo'];
    }
    
    if (isset($params['descricao'])) {
        $update_args['description'] = $params['descricao'];
    }
    
    if (!empty($update_args)) {
        wp_update_term($term_id, 'ap_modulo', $update_args);
    }
    
    if (isset($params['trilhaId'])) {
        update_term_meta($term_id, '_ap_modulo_trilha_id', intval($params['trilhaId']));
    }
    
    if (isset($params['ordem'])) {
        update_term_meta($term_id, '_ap_modulo_ordem', intval($params['ordem']));
    }
    
    if (isset($params['videoUrl'])) {
        update_term_meta($term_id, '_ap_modulo_video_url', esc_url_raw($params['videoUrl']));
    }
    
    if (isset($params['videoInicio'])) {
        update_term_meta($term_id, '_ap_modulo_video_inicio', intval($params['videoInicio']));
    }
    
    if (isset($params['videoFim'])) {
        update_term_meta($term_id, '_ap_modulo_video_fim', intval($params['videoFim']));
    }
    
    $term = get_term($term_id, 'ap_modulo');
    
    $data = array(
        'id' => $term->term_id,
        'trilhaId' => get_term_meta($term_id, '_ap_modulo_trilha_id', true),
        'titulo' => $term->name,
        'descricao' => $term->description,
        'ordem' => get_term_meta($term_id, '_ap_modulo_ordem', true),
        'videoUrl' => get_term_meta($term_id, '_ap_modulo_video_url', true),
        'videoInicio' => get_term_meta($term_id, '_ap_modulo_video_inicio', true),
        'videoFim' => get_term_meta($term_id, '_ap_modulo_video_fim', true),
    );
    
    return rest_ensure_response($data);
}

function academia_paygas_delete_modulo($request) {
    $term_id = $request['id'];
    
    $result = wp_delete_term($term_id, 'ap_modulo');
    
    if (is_wp_error($result)) {
        return $result;
    }
    
    if ($result !== false) {
        return rest_ensure_response(array('message' => __('Módulo eliminado', 'academia-paygas')));
    }
    
    return new WP_Error('delete_failed', __('Error al eliminar módulo', 'academia-paygas'), array('status' => 500));
}

/**
 * AULAS CRUD
 */
function academia_paygas_get_aulas($request) {
    $modulo_id = $request->get_param('modulo_id');
    
    $args = array(
        'post_type' => 'ap_aula',
        'posts_per_page' => -1,
        'meta_query' => array(),
    );
    
    if ($modulo_id) {
        $args['meta_query'][] = array(
            'key' => '_ap_aula_modulo_id',
            'value' => $modulo_id,
        );
    }
    
    $posts = get_posts($args);
    $data = array();
    
    foreach ($posts as $post) {
        $data[] = array(
            'id' => $post->ID,
            'moduloId' => get_post_meta($post->ID, '_ap_aula_modulo_id', true),
            'titulo' => $post->post_title,
            'descricao' => $post->post_content,
            'ordem' => get_post_meta($post->ID, '_ap_aula_ordem', true),
            'videoUrl' => get_post_meta($post->ID, '_ap_aula_video_url', true),
            'videoInicio' => get_post_meta($post->ID, '_ap_aula_video_inicio', true),
            'videoFim' => get_post_meta($post->ID, '_ap_aula_video_fim', true),
            'duracaoMin' => get_post_meta($post->ID, '_ap_aula_duracao_min', true),
            'createdAt' => $post->post_date,
            'updatedAt' => $post->post_modified,
        );
    }
    
    return rest_ensure_response($data);
}

function academia_paygas_get_aula($request) {
    $post_id = $request['id'];
    $post = get_post($post_id);
    
    if (!$post || $post->post_type !== 'ap_aula') {
        return new WP_Error('aula_not_found', __('Aula no encontrada', 'academia-paygas'), array('status' => 404));
    }
    
    $data = array(
        'id' => $post->ID,
        'moduloId' => get_post_meta($post->ID, '_ap_aula_modulo_id', true),
        'titulo' => $post->post_title,
        'descricao' => $post->post_content,
        'ordem' => get_post_meta($post->ID, '_ap_aula_ordem', true),
        'videoUrl' => get_post_meta($post->ID, '_ap_aula_video_url', true),
        'videoInicio' => get_post_meta($post->ID, '_ap_aula_video_inicio', true),
        'videoFim' => get_post_meta($post->ID, '_ap_aula_video_fim', true),
        'duracaoMin' => get_post_meta($post->ID, '_ap_aula_duracao_min', true),
        'createdAt' => $post->post_date,
        'updatedAt' => $post->post_modified,
    );
    
    return rest_ensure_response($data);
}

function academia_paygas_create_aula($request) {
    $params = $request->get_json_params();
    
    $post_id = wp_insert_post(array(
        'post_title' => $params['titulo'],
        'post_content' => $params['descricao'] ?? '',
        'post_type' => 'ap_aula',
        'post_status' => 'publish',
    ));
    
    if (is_wp_error($post_id)) {
        return $post_id;
    }
    
    if (isset($params['moduloId'])) {
        update_post_meta($post_id, '_ap_aula_modulo_id', intval($params['moduloId']));
    }
    
    if (isset($params['ordem'])) {
        update_post_meta($post_id, '_ap_aula_ordem', intval($params['ordem']));
    }
    
    if (isset($params['videoUrl'])) {
        update_post_meta($post_id, '_ap_aula_video_url', esc_url_raw($params['videoUrl']));
    }
    
    if (isset($params['videoInicio'])) {
        update_post_meta($post_id, '_ap_aula_video_inicio', intval($params['videoInicio']));
    }
    
    if (isset($params['videoFim'])) {
        update_post_meta($post_id, '_ap_aula_video_fim', intval($params['videoFim']));
    }
    
    if (isset($params['duracaoMin'])) {
        update_post_meta($post_id, '_ap_aula_duracao_min', intval($params['duracaoMin']));
    }
    
    $data = array(
        'id' => $post_id,
        'moduloId' => $params['moduloId'] ?? null,
        'titulo' => $params['titulo'],
        'descricao' => $params['descricao'] ?? '',
        'ordem' => $params['ordem'] ?? 0,
        'videoUrl' => $params['videoUrl'] ?? '',
        'videoInicio' => $params['videoInicio'] ?? null,
        'videoFim' => $params['videoFim'] ?? null,
        'duracaoMin' => $params['duracaoMin'] ?? null,
        'createdAt' => current_time('mysql'),
    );
    
    return rest_ensure_response($data);
}

function academia_paygas_update_aula($request) {
    $post_id = $request['id'];
    $params = $request->get_json_params();
    
    $post = get_post($post_id);
    
    if (!$post || $post->post_type !== 'ap_aula') {
        return new WP_Error('aula_not_found', __('Aula no encontrada', 'academia-paygas'), array('status' => 404));
    }
    
    $update_args = array('ID' => $post_id);
    
    if (isset($params['titulo'])) {
        $update_args['post_title'] = $params['titulo'];
    }
    
    if (isset($params['descricao'])) {
        $update_args['post_content'] = $params['descricao'];
    }
    
    wp_update_post($update_args);
    
    if (isset($params['moduloId'])) {
        update_post_meta($post_id, '_ap_aula_modulo_id', intval($params['moduloId']));
    }
    
    if (isset($params['ordem'])) {
        update_post_meta($post_id, '_ap_aula_ordem', intval($params['ordem']));
    }
    
    if (isset($params['videoUrl'])) {
        update_post_meta($post_id, '_ap_aula_video_url', esc_url_raw($params['videoUrl']));
    }
    
    if (isset($params['videoInicio'])) {
        update_post_meta($post_id, '_ap_aula_video_inicio', intval($params['videoInicio']));
    }
    
    if (isset($params['videoFim'])) {
        update_post_meta($post_id, '_ap_aula_video_fim', intval($params['videoFim']));
    }
    
    if (isset($params['duracaoMin'])) {
        update_post_meta($post_id, '_ap_aula_duracao_min', intval($params['duracaoMin']));
    }
    
    $data = array(
        'id' => $post_id,
        'moduloId' => get_post_meta($post_id, '_ap_aula_modulo_id', true),
        'titulo' => get_the_title($post_id),
        'descricao' => get_post_field('post_content', $post_id),
        'ordem' => get_post_meta($post_id, '_ap_aula_ordem', true),
        'videoUrl' => get_post_meta($post_id, '_ap_aula_video_url', true),
        'videoInicio' => get_post_meta($post_id, '_ap_aula_video_inicio', true),
        'videoFim' => get_post_meta($post_id, '_ap_aula_video_fim', true),
        'duracaoMin' => get_post_meta($post_id, '_ap_aula_duracao_min', true),
        'updatedAt' => current_time('mysql'),
    );
    
    return rest_ensure_response($data);
}

function academia_paygas_delete_aula($request) {
    $post_id = $request['id'];
    
    if (wp_delete_post($post_id, true)) {
        return rest_ensure_response(array('message' => __('Aula eliminada', 'academia-paygas')));
    }
    
    return new WP_Error('delete_failed', __('Error al eliminar aula', 'academia-paygas'), array('status' => 500));
}

/**
 * QUIZ CRUD
 */
function academia_paygas_get_quizzes($request) {
    $aula_id = $request->get_param('aula_id');
    
    $args = array(
        'post_type' => 'ap_quiz',
        'posts_per_page' => -1,
        'meta_query' => array(),
    );
    
    if ($aula_id) {
        $args['meta_query'][] = array(
            'key' => '_ap_quiz_aula_id',
            'value' => $aula_id,
        );
    }
    
    $posts = get_posts($args);
    $data = array();
    
    foreach ($posts as $post) {
        $perguntas = get_post_meta($post->ID, '_ap_quiz_perguntas', true);
        
        $data[] = array(
            'id' => $post->ID,
            'aulaId' => get_post_meta($post->ID, '_ap_quiz_aula_id', true),
            'titulo' => $post->post_title,
            'autoGerarCertificado' => get_post_meta($post->ID, '_ap_quiz_auto_gerar_certificado', true) === '1',
            'perguntas' => $perguntas ?: array(),
            'createdAt' => $post->post_date,
            'updatedAt' => $post->post_modified,
        );
    }
    
    return rest_ensure_response($data);
}

function academia_paygas_get_quiz($request) {
    $post_id = $request['id'];
    $post = get_post($post_id);
    
    if (!$post || $post->post_type !== 'ap_quiz') {
        return new WP_Error('quiz_not_found', __('Quiz no encontrado', 'academia-paygas'), array('status' => 404));
    }
    
    $perguntas = get_post_meta($post->ID, '_ap_quiz_perguntas', true);
    
    $data = array(
        'id' => $post->ID,
        'aulaId' => get_post_meta($post->ID, '_ap_quiz_aula_id', true),
        'titulo' => $post->post_title,
        'autoGerarCertificado' => get_post_meta($post->ID, '_ap_quiz_auto_gerar_certificado', true) === '1',
        'perguntas' => $perguntas ?: array(),
        'createdAt' => $post->post_date,
        'updatedAt' => $post->post_modified,
    );
    
    return rest_ensure_response($data);
}

function academia_paygas_create_quiz($request) {
    $params = $request->get_json_params();
    
    $post_id = wp_insert_post(array(
        'post_title' => $params['titulo'],
        'post_type' => 'ap_quiz',
        'post_status' => 'publish',
    ));
    
    if (is_wp_error($post_id)) {
        return $post_id;
    }
    
    if (isset($params['aulaId'])) {
        update_post_meta($post_id, '_ap_quiz_aula_id', intval($params['aulaId']));
    }
    
    if (isset($params['autoGerarCertificado'])) {
        update_post_meta($post_id, '_ap_quiz_auto_gerar_certificado', $params['autoGerarCertificado'] ? '1' : '0');
    }
    
    if (isset($params['perguntas']) && is_array($params['perguntas'])) {
        update_post_meta($post_id, '_ap_quiz_perguntas', $params['perguntas']);
    }
    
    $data = array(
        'id' => $post_id,
        'aulaId' => $params['aulaId'] ?? null,
        'titulo' => $params['titulo'],
        'autoGerarCertificado' => $params['autoGerarCertificado'] ?? false,
        'perguntas' => $params['perguntas'] ?? array(),
        'createdAt' => current_time('mysql'),
    );
    
    return rest_ensure_response($data);
}

function academia_paygas_update_quiz($request) {
    $post_id = $request['id'];
    $params = $request->get_json_params();
    
    $post = get_post($post_id);
    
    if (!$post || $post->post_type !== 'ap_quiz') {
        return new WP_Error('quiz_not_found', __('Quiz no encontrado', 'academia-paygas'), array('status' => 404));
    }
    
    if (isset($params['titulo'])) {
        wp_update_post(array(
            'ID' => $post_id,
            'post_title' => $params['titulo'],
        ));
    }
    
    if (isset($params['aulaId'])) {
        update_post_meta($post_id, '_ap_quiz_aula_id', intval($params['aulaId']));
    }
    
    if (isset($params['autoGerarCertificado'])) {
        update_post_meta($post_id, '_ap_quiz_auto_gerar_certificado', $params['autoGerarCertificado'] ? '1' : '0');
    }
    
    if (isset($params['perguntas']) && is_array($params['perguntas'])) {
        update_post_meta($post_id, '_ap_quiz_perguntas', $params['perguntas']);
    }
    
    $perguntas = get_post_meta($post_id, '_ap_quiz_perguntas', true);
    
    $data = array(
        'id' => $post_id,
        'aulaId' => get_post_meta($post_id, '_ap_quiz_aula_id', true),
        'titulo' => get_the_title($post_id),
        'autoGerarCertificado' => get_post_meta($post_id, '_ap_quiz_auto_gerar_certificado', true) === '1',
        'perguntas' => $perguntas ?: array(),
        'updatedAt' => current_time('mysql'),
    );
    
    return rest_ensure_response($data);
}

function academia_paygas_delete_quiz($request) {
    $post_id = $request['id'];
    
    if (wp_delete_post($post_id, true)) {
        return rest_ensure_response(array('message' => __('Quiz eliminado', 'academia-paygas')));
    }
    
    return new WP_Error('delete_failed', __('Error al eliminar quiz', 'academia-paygas'), array('status' => 500));
}

/**
 * QUIZ RESPONSE
 */
function academia_paygas_get_quiz_responses($request) {
    $user_id = $request->get_param('user_id');
    $quiz_id = $request->get_param('quiz_id');
    
    $args = array(
        'post_type' => 'ap_quiz_response',
        'posts_per_page' => -1,
        'meta_query' => array(),
    );
    
    if ($user_id) {
        $args['meta_query'][] = array(
            'key' => '_ap_quiz_response_user_id',
            'value' => $user_id,
        );
    }
    
    if ($quiz_id) {
        $args['meta_query'][] = array(
            'key' => '_ap_quiz_response_quiz_id',
            'value' => $quiz_id,
        );
    }
    
    $posts = get_posts($args);
    $data = array();
    
    foreach ($posts as $post) {
        $data[] = array(
            'id' => $post->ID,
            'quizId' => get_post_meta($post->ID, '_ap_quiz_response_quiz_id', true),
            'userId' => get_post_meta($post->ID, '_ap_quiz_response_user_id', true),
            'nota' => get_post_meta($post->ID, '_ap_quiz_response_nota', true),
            'total' => get_post_meta($post->ID, '_ap_quiz_response_total', true),
            'concluido' => get_post_meta($post->ID, '_ap_quiz_response_concluido', true) === '1',
            'createdAt' => $post->post_date,
            'updatedAt' => $post->post_modified,
        );
    }
    
    return rest_ensure_response($data);
}

function academia_paygas_create_quiz_response($request) {
    $params = $request->get_json_params();
    
    $post_id = wp_insert_post(array(
        'post_title' => 'Quiz Response - ' . $params['userId'],
        'post_type' => 'ap_quiz_response',
        'post_status' => 'publish',
    ));
    
    if (is_wp_error($post_id)) {
        return $post_id;
    }
    
    update_post_meta($post_id, '_ap_quiz_response_quiz_id', intval($params['quizId']));
    update_post_meta($post_id, '_ap_quiz_response_user_id', intval($params['userId']));
    update_post_meta($post_id, '_ap_quiz_response_nota', intval($params['nota']));
    update_post_meta($post_id, '_ap_quiz_response_total', intval($params['total']));
    update_post_meta($post_id, '_ap_quiz_response_concluido', $params['concluido'] ? '1' : '0');
    
    $data = array(
        'id' => $post_id,
        'quizId' => $params['quizId'],
        'userId' => $params['userId'],
        'nota' => $params['nota'],
        'total' => $params['total'],
        'concluido' => $params['concluido'],
        'createdAt' => current_time('mysql'),
    );
    
    return rest_ensure_response($data);
}

/**
 * PROGRESSO
 */
function academia_paygas_get_progresso($request) {
    $user_id = $request->get_param('user_id');
    $aula_id = $request->get_param('aula_id');
    
    $args = array(
        'post_type' => 'ap_progresso',
        'posts_per_page' => -1,
        'meta_query' => array(),
    );
    
    if ($user_id) {
        $args['meta_query'][] = array(
            'key' => '_ap_progresso_user_id',
            'value' => $user_id,
        );
    }
    
    if ($aula_id) {
        $args['meta_query'][] = array(
            'key' => '_ap_progresso_aula_id',
            'value' => $aula_id,
        );
    }
    
    $posts = get_posts($args);
    $data = array();
    
    foreach ($posts as $post) {
        $data[] = array(
            'id' => $post->ID,
            'moduloId' => get_post_meta($post->ID, '_ap_progresso_modulo_id', true),
            'aulaId' => get_post_meta($post->ID, '_ap_progresso_aula_id', true),
            'userId' => get_post_meta($post->ID, '_ap_progresso_user_id', true),
            'concluido' => get_post_meta($post->ID, '_ap_progresso_concluido', true) === '1',
            'createdAt' => $post->post_date,
            'updatedAt' => $post->post_modified,
        );
    }
    
    return rest_ensure_response($data);
}

function academia_paygas_create_progresso($request) {
    $params = $request->get_json_params();
    
    $post_id = wp_insert_post(array(
        'post_title' => 'Progresso - ' . $params['userId'],
        'post_type' => 'ap_progresso',
        'post_status' => 'publish',
    ));
    
    if (is_wp_error($post_id)) {
        return $post_id;
    }
    
    update_post_meta($post_id, '_ap_progresso_modulo_id', intval($params['moduloId']));
    update_post_meta($post_id, '_ap_progresso_aula_id', intval($params['aulaId']));
    update_post_meta($post_id, '_ap_progresso_user_id', intval($params['userId']));
    update_post_meta($post_id, '_ap_progresso_concluido', $params['concluido'] ? '1' : '0');
    
    $data = array(
        'id' => $post_id,
        'moduloId' => $params['moduloId'],
        'aulaId' => $params['aulaId'],
        'userId' => $params['userId'],
        'concluido' => $params['concluido'],
        'createdAt' => current_time('mysql'),
    );
    
    return rest_ensure_response($data);
}

function academia_paygas_update_progresso($request) {
    $post_id = $request['id'];
    $params = $request->get_json_params();
    
    $post = get_post($post_id);
    
    if (!$post || $post->post_type !== 'ap_progresso') {
        return new WP_Error('progresso_not_found', __('Progreso no encontrado', 'academia-paygas'), array('status' => 404));
    }
    
    if (isset($params['concluido'])) {
        update_post_meta($post_id, '_ap_progresso_concluido', $params['concluido'] ? '1' : '0');
    }
    
    $data = array(
        'id' => $post_id,
        'moduloId' => get_post_meta($post_id, '_ap_progresso_modulo_id', true),
        'aulaId' => get_post_meta($post_id, '_ap_progresso_aula_id', true),
        'userId' => get_post_meta($post_id, '_ap_progresso_user_id', true),
        'concluido' => get_post_meta($post_id, '_ap_progresso_concluido', true) === '1',
        'updatedAt' => current_time('mysql'),
    );
    
    return rest_ensure_response($data);
}

/**
 * CERTIFICADOS CRUD
 */
function academia_paygas_get_certificados($request) {
    $user_id = $request->get_param('user_id');
    $trilha_id = $request->get_param('trilha_id');
    
    $args = array(
        'post_type' => 'ap_certificate',
        'posts_per_page' => -1,
        'meta_query' => array(),
    );
    
    if ($user_id) {
        $args['meta_query'][] = array(
            'key' => '_ap_certificate_user_id',
            'value' => $user_id,
        );
    }
    
    if ($trilha_id) {
        $args['meta_query'][] = array(
            'key' => '_ap_certificate_trilha_id',
            'value' => $trilha_id,
        );
    }
    
    $posts = get_posts($args);
    $data = array();
    
    foreach ($posts as $post) {
        $data[] = array(
            'id' => $post->ID,
            'userId' => get_post_meta($post->ID, '_ap_certificate_user_id', true),
            'trilhaId' => get_post_meta($post->ID, '_ap_certificate_trilha_id', true),
            'status' => get_post_meta($post->ID, '_ap_certificate_status', true),
            'pdfUrl' => get_post_meta($post->ID, '_ap_certificate_pdf_url', true),
            'aprovadoPor' => get_post_meta($post->ID, '_ap_certificate_aprovado_por', true),
            'aprovadoEm' => get_post_meta($post->ID, '_ap_certificate_aprovado_em', true),
            'createdAt' => $post->post_date,
            'updatedAt' => $post->post_modified,
        );
    }
    
    return rest_ensure_response($data);
}

function academia_paygas_get_certificado($request) {
    $post_id = $request['id'];
    $post = get_post($post_id);
    
    if (!$post || $post->post_type !== 'ap_certificate') {
        return new WP_Error('certificate_not_found', __('Certificado no encontrado', 'academia-paygas'), array('status' => 404));
    }
    
    $data = array(
        'id' => $post->ID,
        'userId' => get_post_meta($post->ID, '_ap_certificate_user_id', true),
        'trilhaId' => get_post_meta($post->ID, '_ap_certificate_trilha_id', true),
        'status' => get_post_meta($post->ID, '_ap_certificate_status', true),
        'pdfUrl' => get_post_meta($post->ID, '_ap_certificate_pdf_url', true),
        'aprovadoPor' => get_post_meta($post->ID, '_ap_certificate_aprovado_por', true),
        'aprovadoEm' => get_post_meta($post->ID, '_ap_certificate_aprovado_em', true),
        'createdAt' => $post->post_date,
        'updatedAt' => $post->post_modified,
    );
    
    return rest_ensure_response($data);
}

function academia_paygas_create_certificado($request) {
    $params = $request->get_json_params();
    
    $post_id = wp_insert_post(array(
        'post_title' => 'Certificado - ' . $params['userId'],
        'post_type' => 'ap_certificate',
        'post_status' => 'publish',
    ));
    
    if (is_wp_error($post_id)) {
        return $post_id;
    }
    
    update_post_meta($post_id, '_ap_certificate_user_id', intval($params['userId']));
    update_post_meta($post_id, '_ap_certificate_trilha_id', intval($params['trilhaId']));
    update_post_meta($post_id, '_ap_certificate_status', sanitize_text_field($params['status'] ?? 'pending'));
    
    if (isset($params['pdfUrl'])) {
        update_post_meta($post_id, '_ap_certificate_pdf_url', esc_url_raw($params['pdfUrl']));
    }
    
    $data = array(
        'id' => $post_id,
        'userId' => $params['userId'],
        'trilhaId' => $params['trilhaId'],
        'status' => $params['status'] ?? 'pending',
        'pdfUrl' => $params['pdfUrl'] ?? '',
        'createdAt' => current_time('mysql'),
    );
    
    return rest_ensure_response($data);
}

function academia_paygas_update_certificado($request) {
    $post_id = $request['id'];
    $params = $request->get_json_params();
    
    $post = get_post($post_id);
    
    if (!$post || $post->post_type !== 'ap_certificate') {
        return new WP_Error('certificate_not_found', __('Certificado no encontrado', 'academia-paygas'), array('status' => 404));
    }
    
    if (isset($params['status'])) {
        update_post_meta($post_id, '_ap_certificate_status', sanitize_text_field($params['status']));
    }
    
    if (isset($params['pdfUrl'])) {
        update_post_meta($post_id, '_ap_certificate_pdf_url', esc_url_raw($params['pdfUrl']));
    }
    
    if (isset($params['aprovadoPor'])) {
        update_post_meta($post_id, '_ap_certificate_aprovado_por', sanitize_text_field($params['aprovadoPor']));
    }
    
    if (isset($params['aprovadoEm'])) {
        update_post_meta($post_id, '_ap_certificate_aprovado_em', sanitize_text_field($params['aprovadoEm']));
    }
    
    $data = array(
        'id' => $post_id,
        'userId' => get_post_meta($post_id, '_ap_certificate_user_id', true),
        'trilhaId' => get_post_meta($post_id, '_ap_certificate_trilha_id', true),
        'status' => get_post_meta($post_id, '_ap_certificate_status', true),
        'pdfUrl' => get_post_meta($post_id, '_ap_certificate_pdf_url', true),
        'aprovadoPor' => get_post_meta($post_id, '_ap_certificate_aprovado_por', true),
        'aprovadoEm' => get_post_meta($post_id, '_ap_certificate_aprovado_em', true),
        'updatedAt' => current_time('mysql'),
    );
    
    return rest_ensure_response($data);
}

/**
 * NOTIFICATIONS
 */
function academia_paygas_get_notifications($request) {
    $to_id = $request->get_param('to_id');
    $from_id = $request->get_param('from_id');
    
    $args = array(
        'post_type' => 'ap_notification',
        'posts_per_page' => -1,
        'meta_query' => array(),
    );
    
    if ($to_id) {
        $args['meta_query'][] = array(
            'key' => '_ap_notification_to_id',
            'value' => $to_id,
        );
    }
    
    if ($from_id) {
        $args['meta_query'][] = array(
            'key' => '_ap_notification_from_id',
            'value' => $from_id,
        );
    }
    
    $posts = get_posts($args);
    $data = array();
    
    foreach ($posts as $post) {
        $data[] = array(
            'id' => $post->ID,
            'fromId' => get_post_meta($post->ID, '_ap_notification_from_id', true),
            'toId' => get_post_meta($post->ID, '_ap_notification_to_id', true),
            'titulo' => $post->post_title,
            'mensagem' => $post->post_content,
            'lida' => get_post_meta($post->ID, '_ap_notification_lida', true) === '1',
            'createdAt' => $post->post_date,
        );
    }
    
    return rest_ensure_response($data);
}

function academia_paygas_create_notification($request) {
    $params = $request->get_json_params();
    
    $post_id = wp_insert_post(array(
        'post_title' => $params['titulo'],
        'post_content' => $params['mensagem'],
        'post_type' => 'ap_notification',
        'post_status' => 'publish',
    ));
    
    if (is_wp_error($post_id)) {
        return $post_id;
    }
    
    update_post_meta($post_id, '_ap_notification_from_id', intval($params['fromId']));
    update_post_meta($post_id, '_ap_notification_to_id', intval($params['toId']));
    update_post_meta($post_id, '_ap_notification_lida', '0');
    
    $data = array(
        'id' => $post_id,
        'fromId' => $params['fromId'],
        'toId' => $params['toId'],
        'titulo' => $params['titulo'],
        'mensagem' => $params['mensagem'],
        'lida' => false,
        'createdAt' => current_time('mysql'),
    );
    
    return rest_ensure_response($data);
}

function academia_paygas_update_notification($request) {
    $post_id = $request['id'];
    $params = $request->get_json_params();
    
    $post = get_post($post_id);
    
    if (!$post || $post->post_type !== 'ap_notification') {
        return new WP_Error('notification_not_found', __('Notificación no encontrada', 'academia-paygas'), array('status' => 404));
    }
    
    if (isset($params['lida'])) {
        update_post_meta($post_id, '_ap_notification_lida', $params['lida'] ? '1' : '0');
    }
    
    $data = array(
        'id' => $post_id,
        'fromId' => get_post_meta($post_id, '_ap_notification_from_id', true),
        'toId' => get_post_meta($post_id, '_ap_notification_to_id', true),
        'titulo' => $post->post_title,
        'mensagem' => $post->post_content,
        'lida' => get_post_meta($post_id, '_ap_notification_lida', true) === '1',
    );
    
    return rest_ensure_response($data);
}

/**
 * ACTIVITY LOGS
 */
function academia_paygas_get_activity_logs($request) {
    $user_id = $request->get_param('user_id');
    
    $args = array(
        'post_type' => 'ap_activity_log',
        'posts_per_page' => -1,
        'meta_query' => array(),
    );
    
    if ($user_id) {
        $args['meta_query'][] = array(
            'key' => '_ap_activity_log_user_id',
            'value' => $user_id,
        );
    }
    
    $posts = get_posts($args);
    $data = array();
    
    foreach ($posts as $post) {
        $data[] = array(
            'id' => $post->ID,
            'userId' => get_post_meta($post->ID, '_ap_activity_log_user_id', true),
            'acao' => get_post_meta($post->ID, '_ap_activity_log_acao', true),
            'detalhes' => get_post_meta($post->ID, '_ap_activity_log_detalhes', true),
            'createdAt' => $post->post_date,
        );
    }
    
    return rest_ensure_response($data);
}

function academia_paygas_create_activity_log($request) {
    $params = $request->get_json_params();
    
    $post_id = wp_insert_post(array(
        'post_title' => $params['acao'],
        'post_content' => $params['detalhes'] ?? '',
        'post_type' => 'ap_activity_log',
        'post_status' => 'publish',
    ));
    
    if (is_wp_error($post_id)) {
        return $post_id;
    }
    
    update_post_meta($post_id, '_ap_activity_log_user_id', intval($params['userId']));
    update_post_meta($post_id, '_ap_activity_log_acao', sanitize_text_field($params['acao']));
    update_post_meta($post_id, '_ap_activity_log_detalhes', sanitize_textarea_field($params['detalhes'] ?? ''));
    
    $data = array(
        'id' => $post_id,
        'userId' => $params['userId'],
        'acao' => $params['acao'],
        'detalhes' => $params['detalhes'] ?? '',
        'createdAt' => current_time('mysql'),
    );
    
    return rest_ensure_response($data);
}

/**
 * TRILHA ATENDENTE
 */
function academia_paygas_get_trilha_atendente($request) {
    $user_id = $request->get_param('user_id');
    $trilha_id = $request->get_param('trilha_id');
    
    $args = array(
        'post_type' => 'ap_trilha_atendente',
        'posts_per_page' => -1,
        'meta_query' => array(),
    );
    
    if ($user_id) {
        $args['meta_query'][] = array(
            'key' => '_ap_trilha_atendente_user_id',
            'value' => $user_id,
        );
    }
    
    if ($trilha_id) {
        $args['meta_query'][] = array(
            'key' => '_ap_trilha_atendente_trilha_id',
            'value' => $trilha_id,
        );
    }
    
    $posts = get_posts($args);
    $data = array();
    
    foreach ($posts as $post) {
        $data[] = array(
            'id' => $post->ID,
            'trilhaId' => get_post_meta($post->ID, '_ap_trilha_atendente_trilha_id', true),
            'userId' => get_post_meta($post->ID, '_ap_trilha_atendente_user_id', true),
            'createdAt' => $post->post_date,
        );
    }
    
    return rest_ensure_response($data);
}

function academia_paygas_create_trilha_atendente($request) {
    $params = $request->get_json_params();
    
    $post_id = wp_insert_post(array(
        'post_title' => 'Trilha Atendente - ' . $params['userId'],
        'post_type' => 'ap_trilha_atendente',
        'post_status' => 'publish',
    ));
    
    if (is_wp_error($post_id)) {
        return $post_id;
    }
    
    update_post_meta($post_id, '_ap_trilha_atendente_trilha_id', intval($params['trilhaId']));
    update_post_meta($post_id, '_ap_trilha_atendente_user_id', intval($params['userId']));
    
    $data = array(
        'id' => $post_id,
        'trilhaId' => $params['trilhaId'],
        'userId' => $params['userId'],
        'createdAt' => current_time('mysql'),
    );
    
    return rest_ensure_response($data);
}

function academia_paygas_delete_trilha_atendente($request) {
    $post_id = $request['id'];
    
    if (wp_delete_post($post_id, true)) {
        return rest_ensure_response(array('message' => __('Trilha Atendente eliminada', 'academia-paygas')));
    }
    
    return new WP_Error('delete_failed', __('Error al eliminar trilha atendente', 'academia-paygas'), array('status' => 500));
}

<?php
/**
 * Registrar Custom Post Types para Academia PayGas
 */

// Evitar acceso directo
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Registrar todos los Custom Post Types
 */
function academia_paygas_register_post_types() {
    // Aula (ahora es el CPT principal)
    register_post_type('ap_aula', array(
        'labels' => array(
            'name' => __('Aulas', 'academia-paygas'),
            'singular_name' => __('Aula', 'academia-paygas'),
            'menu_name' => __('Aulas', 'academia-paygas'),
            'add_new' => __('Adicionar Nova', 'academia-paygas'),
            'add_new_item' => __('Adicionar Nova Aula', 'academia-paygas'),
            'edit_item' => __('Editar Aula', 'academia-paygas'),
            'new_item' => __('Nova Aula', 'academia-paygas'),
            'view_item' => __('Ver Aula', 'academia-paygas'),
            'search_items' => __('Buscar Aulas', 'academia-paygas'),
            'not_found' => __('Nenhuma aula encontrada', 'academia-paygas'),
            'not_found_in_trash' => __('Nenhuma aula encontrada na lixeira', 'academia-paygas'),
        ),
        'public' => true,
        'show_ui' => true,
        'has_archive' => true,
        'menu_icon' => 'dashicons-video-alt3',
        'supports' => array('title', 'editor', 'thumbnail', 'excerpt'),
        'rewrite' => array('slug' => 'aulas'),
        'show_in_rest' => true,
        'rest_base' => 'aulas',
        'rest_controller_class' => 'WP_REST_Posts_Controller',
        'taxonomies' => array('ap_trilha', 'ap_modulo'),
    ));

    // Quiz
    register_post_type('ap_quiz', array(
        'labels' => array(
            'name' => __('Quizzes', 'academia-paygas'),
            'singular_name' => __('Quiz', 'academia-paygas'),
            'menu_name' => __('Quizzes', 'academia-paygas'),
            'add_new' => __('Adicionar Novo', 'academia-paygas'),
            'add_new_item' => __('Adicionar Novo Quiz', 'academia-paygas'),
            'edit_item' => __('Editar Quiz', 'academia-paygas'),
            'new_item' => __('Novo Quiz', 'academia-paygas'),
            'view_item' => __('Ver Quiz', 'academia-paygas'),
            'search_items' => __('Buscar Quizzes', 'academia-paygas'),
            'not_found' => __('Nenhum quiz encontrado', 'academia-paygas'),
            'not_found_in_trash' => __('Nenhum quiz encontrado na lixeira', 'academia-paygas'),
        ),
        'public' => true,
        'show_ui' => true,
        'has_archive' => true,
        'menu_icon' => 'dashicons-list-view',
        'supports' => array('title', 'editor'),
        'rewrite' => array('slug' => 'quizzes'),
        'show_in_rest' => true,
        'rest_base' => 'quizzes',
        'rest_controller_class' => 'WP_REST_Posts_Controller',
    ));

    // Certificate
    register_post_type('ap_certificate', array(
        'labels' => array(
            'name' => __('Certificados', 'academia-paygas'),
            'singular_name' => __('Certificado', 'academia-paygas'),
            'menu_name' => __('Certificados', 'academia-paygas'),
            'add_new' => __('Adicionar Novo', 'academia-paygas'),
            'add_new_item' => __('Adicionar Novo Certificado', 'academia-paygas'),
            'edit_item' => __('Editar Certificado', 'academia-paygas'),
            'new_item' => __('Novo Certificado', 'academia-paygas'),
            'view_item' => __('Ver Certificado', 'academia-paygas'),
            'search_items' => __('Buscar Certificados', 'academia-paygas'),
            'not_found' => __('Nenhum certificado encontrado', 'academia-paygas'),
            'not_found_in_trash' => __('Nenhum certificado encontrado na lixeira', 'academia-paygas'),
        ),
        'public' => true,
        'show_ui' => true,
        'has_archive' => true,
        'menu_icon' => 'dashicons-awards',
        'supports' => array('title'),
        'rewrite' => array('slug' => 'certificados'),
        'show_in_rest' => true,
        'rest_base' => 'certificados',
        'rest_controller_class' => 'WP_REST_Posts_Controller',
        'capability_type' => 'post',
        'capabilities' => array(
            'create_posts' => 'do_not_allow',
            'delete_posts' => 'do_not_allow',
        ),
    ));

    // Notification
    register_post_type('ap_notification', array(
        'labels' => array(
            'name' => __('Notificações', 'academia-paygas'),
            'singular_name' => __('Notificação', 'academia-paygas'),
            'menu_name' => __('Notificações', 'academia-paygas'),
            'add_new' => __('Adicionar Nova', 'academia-paygas'),
            'add_new_item' => __('Adicionar Nova Notificação', 'academia-paygas'),
            'edit_item' => __('Editar Notificação', 'academia-paygas'),
            'new_item' => __('Nova Notificação', 'academia-paygas'),
            'view_item' => __('Ver Notificação', 'academia-paygas'),
            'search_items' => __('Buscar Notificações', 'academia-paygas'),
            'not_found' => __('Nenhuma notificação encontrada', 'academia-paygas'),
            'not_found_in_trash' => __('Nenhuma notificação encontrada na lixeira', 'academia-paygas'),
        ),
        'public' => false,
        'show_ui' => true,
        'has_archive' => false,
        'menu_icon' => 'dashicons-bell',
        'supports' => array('title', 'editor'),
        'rewrite' => false,
        'show_in_rest' => true,
        'rest_base' => 'notifications',
        'rest_controller_class' => 'WP_REST_Posts_Controller',
    ));

    // Activity Log
    register_post_type('ap_activity_log', array(
        'labels' => array(
            'name' => __('Logs de Atividade', 'academia-paygas'),
            'singular_name' => __('Log de Atividade', 'academia-paygas'),
            'menu_name' => __('Logs de Atividade', 'academia-paygas'),
            'add_new' => __('Adicionar Novo', 'academia-paygas'),
            'add_new_item' => __('Adicionar Novo Log', 'academia-paygas'),
            'edit_item' => __('Editar Log', 'academia-paygas'),
            'new_item' => __('Novo Log', 'academia-paygas'),
            'view_item' => __('Ver Log', 'academia-paygas'),
            'search_items' => __('Buscar Logs', 'academia-paygas'),
            'not_found' => __('Nenhum log encontrado', 'academia-paygas'),
            'not_found_in_trash' => __('Nenhum log encontrado na lixeira', 'academia-paygas'),
        ),
        'public' => false,
        'show_ui' => true,
        'has_archive' => false,
        'menu_icon' => 'dashicons-admin-page',
        'supports' => array('title', 'editor'),
        'rewrite' => false,
        'show_in_rest' => true,
        'rest_base' => 'activity-logs',
        'rest_controller_class' => 'WP_REST_Posts_Controller',
        'capability_type' => 'post',
        'capabilities' => array(
            'create_posts' => 'do_not_allow',
        ),
    ));

    // Quiz Response
    register_post_type('ap_quiz_response', array(
        'labels' => array(
            'name' => __('Respostas de Quiz', 'academia-paygas'),
            'singular_name' => __('Resposta de Quiz', 'academia-paygas'),
            'menu_name' => __('Respostas de Quiz', 'academia-paygas'),
            'add_new' => __('Adicionar Nova', 'academia-paygas'),
            'add_new_item' => __('Adicionar Nova Resposta', 'academia-paygas'),
            'edit_item' => __('Editar Resposta', 'academia-paygas'),
            'new_item' => __('Nova Resposta', 'academia-paygas'),
            'view_item' => __('Ver Resposta', 'academia-paygas'),
            'search_items' => __('Buscar Respostas', 'academia-paygas'),
            'not_found' => __('Nenhuma resposta encontrada', 'academia-paygas'),
            'not_found_in_trash' => __('Nenhuma resposta encontrada na lixeira', 'academia-paygas'),
        ),
        'public' => false,
        'show_ui' => true,
        'has_archive' => false,
        'menu_icon' => 'dashicons-clipboard',
        'supports' => array('title'),
        'rewrite' => false,
        'show_in_rest' => true,
        'rest_base' => 'quiz-responses',
        'rest_controller_class' => 'WP_REST_Posts_Controller',
        'capability_type' => 'post',
        'capabilities' => array(
            'create_posts' => 'do_not_allow',
        ),
    ));

    // Progresso
    register_post_type('ap_progresso', array(
        'labels' => array(
            'name' => __('Progressos', 'academia-paygas'),
            'singular_name' => __('Progresso', 'academia-paygas'),
            'menu_name' => __('Progressos', 'academia-paygas'),
            'add_new' => __('Adicionar Novo', 'academia-paygas'),
            'add_new_item' => __('Adicionar Novo Progresso', 'academia-paygas'),
            'edit_item' => __('Editar Progresso', 'academia-paygas'),
            'new_item' => __('Novo Progresso', 'academia-paygas'),
            'view_item' => __('Ver Progresso', 'academia-paygas'),
            'search_items' => __('Buscar Progressos', 'academia-paygas'),
            'not_found' => __('Nenhum progresso encontrado', 'academia-paygas'),
            'not_found_in_trash' => __('Nenhum progresso encontrado na lixeira', 'academia-paygas'),
        ),
        'public' => false,
        'show_ui' => true,
        'has_archive' => false,
        'menu_icon' => 'dashicons-chart-bar',
        'supports' => array('title'),
        'rewrite' => false,
        'show_in_rest' => true,
        'rest_base' => 'progressos',
        'rest_controller_class' => 'WP_REST_Posts_Controller',
        'capability_type' => 'post',
        'capabilities' => array(
            'create_posts' => 'do_not_allow',
        ),
    ));

    // Trilha Atendente
    register_post_type('ap_trilha_atendente', array(
        'labels' => array(
            'name' => __('Trilhas de Atendentes', 'academia-paygas'),
            'singular_name' => __('Trilha de Atendente', 'academia-paygas'),
            'menu_name' => __('Trilhas de Atendentes', 'academia-paygas'),
            'add_new' => __('Adicionar Nova', 'academia-paygas'),
            'add_new_item' => __('Adicionar Nova Trilha', 'academia-paygas'),
            'edit_item' => __('Editar Trilha', 'academia-paygas'),
            'new_item' => __('Nova Trilha', 'academia-paygas'),
            'view_item' => __('Ver Trilha', 'academia-paygas'),
            'search_items' => __('Buscar Trilhas', 'academia-paygas'),
            'not_found' => __('Nenhuma trilha encontrada', 'academia-paygas'),
            'not_found_in_trash' => __('Nenhuma trilha encontrada na lixeira', 'academia-paygas'),
        ),
        'public' => false,
        'show_ui' => true,
        'has_archive' => false,
        'menu_icon' => 'dashicons-groups',
        'supports' => array('title'),
        'rewrite' => false,
        'show_in_rest' => true,
        'rest_base' => 'trilha-atendentes',
        'rest_controller_class' => 'WP_REST_Posts_Controller',
        'capability_type' => 'post',
        'capabilities' => array(
            'create_posts' => 'do_not_allow',
        ),
    ));
}

/**
 * Registrar taxonomías para Aulas (Trilhas y Modulos)
 */
function academia_paygas_register_taxonomies() {
    // Taxonomía Trilha
    register_taxonomy('ap_trilha', 'ap_aula', array(
        'labels' => array(
            'name' => __('Trilhas', 'academia-paygas'),
            'singular_name' => __('Trilha', 'academia-paygas'),
            'menu_name' => __('Trilhas', 'academia-paygas'),
            'search_items' => __('Buscar Trilhas', 'academia-paygas'),
            'all_items' => __('Todas as Trilhas', 'academia-paygas'),
            'parent_item' => __('Trilha Pai', 'academia-paygas'),
            'parent_item_colon' => __('Trilha Pai:', 'academia-paygas'),
            'edit_item' => __('Editar Trilha', 'academia-paygas'),
            'update_item' => __('Atualizar Trilha', 'academia-paygas'),
            'add_new_item' => __('Adicionar Nova Trilha', 'academia-paygas'),
            'new_item_name' => __('Nova Trilha', 'academia-paygas'),
        ),
        'hierarchical' => true,
        'public' => true,
        'show_ui' => true,
        'show_admin_column' => true,
        'show_in_rest' => true,
        'query_var' => true,
        'rewrite' => array('slug' => 'trilha'),
    ));

    // Taxonomía Modulo
    register_taxonomy('ap_modulo', 'ap_aula', array(
        'labels' => array(
            'name' => __('Módulos', 'academia-paygas'),
            'singular_name' => __('Módulo', 'academia-paygas'),
            'menu_name' => __('Módulos', 'academia-paygas'),
            'search_items' => __('Buscar Módulos', 'academia-paygas'),
            'all_items' => __('Todos os Módulos', 'academia-paygas'),
            'parent_item' => __('Módulo Pai', 'academia-paygas'),
            'parent_item_colon' => __('Módulo Pai:', 'academia-paygas'),
            'edit_item' => __('Editar Módulo', 'academia-paygas'),
            'update_item' => __('Atualizar Módulo', 'academia-paygas'),
            'add_new_item' => __('Adicionar Novo Módulo', 'academia-paygas'),
            'new_item_name' => __('Novo Módulo', 'academia-paygas'),
        ),
        'hierarchical' => true,
        'public' => true,
        'show_ui' => true,
        'show_admin_column' => true,
        'show_in_rest' => true,
        'query_var' => true,
        'rewrite' => array('slug' => 'modulo'),
    ));
}

/**
 * Registrar roles personalizados para usuarios de la academia
 */
function academia_paygas_register_roles() {
    // Role Admin PayGas
    add_role('academia_admin', __('Admin PayGas', 'academia-paygas'), array(
        'read' => true,
        'edit_posts' => true,
        'delete_posts' => true,
        'publish_posts' => true,
        'upload_files' => true,
        'manage_categories' => true,
        'manage_options' => true,
    ));

    // Role Gestor de Posto
    add_role('academia_gestor', __('Gestor de Posto', 'academia-paygas'), array(
        'read' => true,
        'edit_posts' => true,
        'delete_posts' => false,
        'publish_posts' => false,
        'upload_files' => true,
    ));

    // Role Atendente
    add_role('academia_atendente', __('Atendente', 'academia-paygas'), array(
        'read' => true,
    ));
}

// Hook para registrar los roles
add_action('init', 'academia_paygas_register_roles');

// Hook para registrar los Custom Post Types
add_action('init', 'academia_paygas_register_post_types');

// Hook para registrar las taxonomías
add_action('init', 'academia_paygas_register_taxonomies');

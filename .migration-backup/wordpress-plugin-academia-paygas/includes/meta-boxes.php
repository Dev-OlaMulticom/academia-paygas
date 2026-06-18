<?php
/**
 * Meta Boxes para Custom Post Types y Taxonomías de Academia PayGas
 */

// Evitar acceso directo
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Agregar campos personalizados para taxonomía Trilha
 */
add_action('ap_trilha_add_form_fields', 'academia_paygas_trilha_add_form_fields');
add_action('ap_trilha_edit_form_fields', 'academia_paygas_trilha_edit_form_fields');

function academia_paygas_trilha_add_form_fields($term) {
    wp_nonce_field('academia_paygas_trilha_meta_box', 'academia_paygas_trilha_meta_box_nonce');
    ?>
    <div class="form-field">
        <label for="ap_trilha_icon"><?php _e('Icono (clase Dashicons):', 'academia-paygas'); ?></label>
        <input type="text" id="ap_trilha_icon" name="ap_trilha_icon" class="regular-text">
        <p class="description"><?php _e('Ej: dashicons-book-alt', 'academia-paygas'); ?></p>
    </div>
    <div class="form-field">
        <label for="ap_trilha_color"><?php _e('Color (hex):', 'academia-paygas'); ?></label>
        <input type="color" id="ap_trilha_color" name="ap_trilha_color" value="#3b82f6">
    </div>
    <div class="form-field">
        <label>
            <input type="checkbox" id="ap_trilha_obrigatorio" name="ap_trilha_obrigatorio" value="1">
            <?php _e('Obrigatorio', 'academia-paygas'); ?>
        </label>
    </div>
    <?php
}

function academia_paygas_trilha_edit_form_fields($term) {
    wp_nonce_field('academia_paygas_trilha_meta_box', 'academia_paygas_trilha_meta_box_nonce');
    
    $icon = get_term_meta($term->term_id, '_ap_trilha_icon', true);
    $color = get_term_meta($term->term_id, '_ap_trilha_color', true);
    $obrigatorio = get_term_meta($term->term_id, '_ap_trilha_obrigatorio', true);
    ?>
    <tr class="form-field">
        <th scope="row"><label for="ap_trilha_icon"><?php _e('Icono (clase Dashicons):', 'academia-paygas'); ?></label></th>
        <td>
            <input type="text" id="ap_trilha_icon" name="ap_trilha_icon" value="<?php echo esc_attr($icon); ?>" class="regular-text">
            <p class="description"><?php _e('Ej: dashicons-book-alt', 'academia-paygas'); ?></p>
        </td>
    </tr>
    <tr class="form-field">
        <th scope="row"><label for="ap_trilha_color"><?php _e('Color (hex):', 'academia-paygas'); ?></label></th>
        <td>
            <input type="color" id="ap_trilha_color" name="ap_trilha_color" value="<?php echo esc_attr($color); ?>">
        </td>
    </tr>
    <tr class="form-field">
        <th scope="row"><label><?php _e('Obrigatorio', 'academia-paygas'); ?></label></th>
        <td>
            <label>
                <input type="checkbox" id="ap_trilha_obrigatorio" name="ap_trilha_obrigatorio" value="1" <?php checked($obrigatorio, '1'); ?>>
                <?php _e('Marcar como obrigatorio', 'academia-paygas'); ?>
            </label>
        </td>
    </tr>
    <?php
}

add_action('created_ap_trilha', 'academia_paygas_save_trilha_meta', 10, 2);
add_action('edited_ap_trilha', 'academia_paygas_save_trilha_meta', 10, 2);

function academia_paygas_save_trilha_meta($term_id, $term_taxonomy_id) {
    if (!isset($_POST['academia_paygas_trilha_meta_box_nonce']) || !wp_verify_nonce($_POST['academia_paygas_trilha_meta_box_nonce'], 'academia_paygas_trilha_meta_box')) {
        return;
    }
    
    if (isset($_POST['ap_trilha_icon'])) {
        update_term_meta($term_id, '_ap_trilha_icon', sanitize_text_field($_POST['ap_trilha_icon']));
    }
    
    if (isset($_POST['ap_trilha_color'])) {
        update_term_meta($term_id, '_ap_trilha_color', sanitize_hex_color($_POST['ap_trilha_color']));
    }
    
    if (isset($_POST['ap_trilha_obrigatorio'])) {
        update_term_meta($term_id, '_ap_trilha_obrigatorio', '1');
    } else {
        update_term_meta($term_id, '_ap_trilha_obrigatorio', '0');
    }
}

/**
 * Agregar campos personalizados para taxonomía Modulo
 */
add_action('ap_modulo_add_form_fields', 'academia_paygas_modulo_add_form_fields');
add_action('ap_modulo_edit_form_fields', 'academia_paygas_modulo_edit_form_fields');

function academia_paygas_modulo_add_form_fields($term) {
    wp_nonce_field('academia_paygas_modulo_meta_box', 'academia_paygas_modulo_meta_box_nonce');
    
    $trilhas = get_terms(array('taxonomy' => 'ap_trilha', 'hide_empty' => false));
    ?>
    <div class="form-field">
        <label for="ap_modulo_trilha_id"><?php _e('Trilha:', 'academia-paygas'); ?></label>
        <select id="ap_modulo_trilha_id" name="ap_modulo_trilha_id" class="regular-text">
            <option value=""><?php _e('Seleccionar Trilha', 'academia-paygas'); ?></option>
            <?php foreach ($trilhas as $trilha): ?>
                <option value="<?php echo esc_attr($trilha->term_id); ?>"><?php echo esc_html($trilha->name); ?></option>
            <?php endforeach; ?>
        </select>
    </div>
    <div class="form-field">
        <label for="ap_modulo_ordem"><?php _e('Orden:', 'academia-paygas'); ?></label>
        <input type="number" id="ap_modulo_ordem" name="ap_modulo_ordem" class="small-text">
    </div>
    <div class="form-field">
        <label for="ap_modulo_video_url"><?php _e('URL del Video:', 'academia-paygas'); ?></label>
        <input type="url" id="ap_modulo_video_url" name="ap_modulo_video_url" class="regular-text">
    </div>
    <div class="form-field">
        <label for="ap_modulo_video_inicio"><?php _e('Inicio del Video (segundos):', 'academia-paygas'); ?></label>
        <input type="number" id="ap_modulo_video_inicio" name="ap_modulo_video_inicio" class="small-text">
    </div>
    <div class="form-field">
        <label for="ap_modulo_video_fim"><?php _e('Fin del Video (segundos):', 'academia-paygas'); ?></label>
        <input type="number" id="ap_modulo_video_fim" name="ap_modulo_video_fim" class="small-text">
    </div>
    <?php
}

function academia_paygas_modulo_edit_form_fields($term) {
    wp_nonce_field('academia_paygas_modulo_meta_box', 'academia_paygas_modulo_meta_box_nonce');
    
    $trilha_id = get_term_meta($term->term_id, '_ap_modulo_trilha_id', true);
    $ordem = get_term_meta($term->term_id, '_ap_modulo_ordem', true);
    $video_url = get_term_meta($term->term_id, '_ap_modulo_video_url', true);
    $video_inicio = get_term_meta($term->term_id, '_ap_modulo_video_inicio', true);
    $video_fim = get_term_meta($term->term_id, '_ap_modulo_video_fim', true);
    
    $trilhas = get_terms(array('taxonomy' => 'ap_trilha', 'hide_empty' => false));
    ?>
    <tr class="form-field">
        <th scope="row"><label for="ap_modulo_trilha_id"><?php _e('Trilha:', 'academia-paygas'); ?></label></th>
        <td>
            <select id="ap_modulo_trilha_id" name="ap_modulo_trilha_id" class="regular-text">
                <option value=""><?php _e('Seleccionar Trilha', 'academia-paygas'); ?></option>
                <?php foreach ($trilhas as $trilha): ?>
                    <option value="<?php echo esc_attr($trilha->term_id); ?>" <?php selected($trilha_id, $trilha->term_id); ?>><?php echo esc_html($trilha->name); ?></option>
                <?php endforeach; ?>
            </select>
        </td>
    </tr>
    <tr class="form-field">
        <th scope="row"><label for="ap_modulo_ordem"><?php _e('Orden:', 'academia-paygas'); ?></label></th>
        <td>
            <input type="number" id="ap_modulo_ordem" name="ap_modulo_ordem" value="<?php echo esc_attr($ordem); ?>" class="small-text">
        </td>
    </tr>
    <tr class="form-field">
        <th scope="row"><label for="ap_modulo_video_url"><?php _e('URL del Video:', 'academia-paygas'); ?></label></th>
        <td>
            <input type="url" id="ap_modulo_video_url" name="ap_modulo_video_url" value="<?php echo esc_url($video_url); ?>" class="regular-text">
        </td>
    </tr>
    <tr class="form-field">
        <th scope="row"><label for="ap_modulo_video_inicio"><?php _e('Inicio del Video (segundos):', 'academia-paygas'); ?></label></th>
        <td>
            <input type="number" id="ap_modulo_video_inicio" name="ap_modulo_video_inicio" value="<?php echo esc_attr($video_inicio); ?>" class="small-text">
        </td>
    </tr>
    <tr class="form-field">
        <th scope="row"><label for="ap_modulo_video_fim"><?php _e('Fin del Video (segundos):', 'academia-paygas'); ?></label></th>
        <td>
            <input type="number" id="ap_modulo_video_fim" name="ap_modulo_video_fim" value="<?php echo esc_attr($video_fim); ?>" class="small-text">
        </td>
    </tr>
    <?php
}

add_action('created_ap_modulo', 'academia_paygas_save_modulo_meta', 10, 2);
add_action('edited_ap_modulo', 'academia_paygas_save_modulo_meta', 10, 2);

function academia_paygas_save_modulo_meta($term_id, $term_taxonomy_id) {
    if (!isset($_POST['academia_paygas_modulo_meta_box_nonce']) || !wp_verify_nonce($_POST['academia_paygas_modulo_meta_box_nonce'], 'academia_paygas_modulo_meta_box')) {
        return;
    }
    
    if (isset($_POST['ap_modulo_trilha_id'])) {
        update_term_meta($term_id, '_ap_modulo_trilha_id', intval($_POST['ap_modulo_trilha_id']));
    }
    
    if (isset($_POST['ap_modulo_ordem'])) {
        update_term_meta($term_id, '_ap_modulo_ordem', intval($_POST['ap_modulo_ordem']));
    }
    
    if (isset($_POST['ap_modulo_video_url'])) {
        update_term_meta($term_id, '_ap_modulo_video_url', esc_url_raw($_POST['ap_modulo_video_url']));
    }
    
    if (isset($_POST['ap_modulo_video_inicio'])) {
        update_term_meta($term_id, '_ap_modulo_video_inicio', intval($_POST['ap_modulo_video_inicio']));
    }
    
    if (isset($_POST['ap_modulo_video_fim'])) {
        update_term_meta($term_id, '_ap_modulo_video_fim', intval($_POST['ap_modulo_video_fim']));
    }
}

/**
 * Agregar meta boxes para Aula (actualizado para usar taxonomías)
 */
add_action('add_meta_boxes', 'academia_paygas_aula_meta_boxes');

function academia_paygas_aula_meta_boxes() {
    add_meta_box(
        'ap_aula_details',
        __('Detalles de la Aula', 'academia-paygas'),
        'academia_paygas_aula_meta_box_callback',
        'ap_aula',
        'normal',
        'high'
    );
}

function academia_paygas_aula_meta_box_callback($post) {
    wp_nonce_field('academia_paygas_aula_meta_box', 'academia_paygas_aula_meta_box_nonce');
    
    $ordem = get_post_meta($post->ID, '_ap_aula_ordem', true);
    $video_url = get_post_meta($post->ID, '_ap_aula_video_url', true);
    $video_inicio = get_post_meta($post->ID, '_ap_aula_video_inicio', true);
    $video_fim = get_post_meta($post->ID, '_ap_aula_video_fim', true);
    $duracao_min = get_post_meta($post->ID, '_ap_aula_duracao_min', true);
    
    ?>
    <div class="academia-paygas-meta-box">
        <p>
            <label for="ap_aula_ordem"><?php _e('Orden:', 'academia-paygas'); ?></label>
            <input type="number" id="ap_aula_ordem" name="ap_aula_ordem" value="<?php echo esc_attr($ordem); ?>" class="small-text">
        </p>
        <p>
            <label for="ap_aula_video_url"><?php _e('URL del Video:', 'academia-paygas'); ?></label>
            <input type="url" id="ap_aula_video_url" name="ap_aula_video_url" value="<?php echo esc_url($video_url); ?>" class="regular-text">
        </p>
        <p>
            <label for="ap_aula_video_inicio"><?php _e('Inicio del Video (segundos):', 'academia-paygas'); ?></label>
            <input type="number" id="ap_aula_video_inicio" name="ap_aula_video_inicio" value="<?php echo esc_attr($video_inicio); ?>" class="small-text">
        </p>
        <p>
            <label for="ap_aula_video_fim"><?php _e('Fin del Video (segundos):', 'academia-paygas'); ?></label>
            <input type="number" id="ap_aula_video_fim" name="ap_aula_video_fim" value="<?php echo esc_attr($video_fim); ?>" class="small-text">
        </p>
        <p>
            <label for="ap_aula_duracao_min"><?php _e('Duración (minutos):', 'academia-paygas'); ?></label>
            <input type="number" id="ap_aula_duracao_min" name="ap_aula_duracao_min" value="<?php echo esc_attr($duracao_min); ?>" class="small-text">
        </p>
        <p class="description">
            <?php _e('Las Trilhas y Módulos se asignan usando las taxonomías en el panel lateral derecho.', 'academia-paygas'); ?>
        </p>
    </div>
    <?php
}

add_action('save_post_ap_aula', 'academia_paygas_save_aula_meta_box');

function academia_paygas_save_aula_meta_box($post_id) {
    if (!isset($_POST['academia_paygas_aula_meta_box_nonce']) || !wp_verify_nonce($_POST['academia_paygas_aula_meta_box_nonce'], 'academia_paygas_aula_meta_box')) {
        return;
    }
    
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
        return;
    }
    
    if (!current_user_can('edit_post', $post_id)) {
        return;
    }
    
    if (isset($_POST['ap_aula_ordem'])) {
        update_post_meta($post_id, '_ap_aula_ordem', intval($_POST['ap_aula_ordem']));
    }
    
    if (isset($_POST['ap_aula_video_url'])) {
        update_post_meta($post_id, '_ap_aula_video_url', esc_url_raw($_POST['ap_aula_video_url']));
    }
    
    if (isset($_POST['ap_aula_video_inicio'])) {
        update_post_meta($post_id, '_ap_aula_video_inicio', intval($_POST['ap_aula_video_inicio']));
    }
    
    if (isset($_POST['ap_aula_video_fim'])) {
        update_post_meta($post_id, '_ap_aula_video_fim', intval($_POST['ap_aula_video_fim']));
    }
    
    if (isset($_POST['ap_aula_duracao_min'])) {
        update_post_meta($post_id, '_ap_aula_duracao_min', intval($_POST['ap_aula_duracao_min']));
    }
}

/**
 * Agregar meta boxes para Quiz
 */
add_action('add_meta_boxes', 'academia_paygas_quiz_meta_boxes');

function academia_paygas_quiz_meta_boxes() {
    add_meta_box(
        'ap_quiz_details',
        __('Detalles del Quiz', 'academia-paygas'),
        'academia_paygas_quiz_meta_box_callback',
        'ap_quiz',
        'normal',
        'high'
    );
    
    add_meta_box(
        'ap_quiz_perguntas',
        __('Preguntas del Quiz', 'academia-paygas'),
        'academia_paygas_quiz_perguntas_meta_box_callback',
        'ap_quiz',
        'normal',
        'high'
    );
}

function academia_paygas_quiz_meta_box_callback($post) {
    wp_nonce_field('academia_paygas_quiz_meta_box', 'academia_paygas_quiz_meta_box_nonce');
    
    $aula_id = get_post_meta($post->ID, '_ap_quiz_aula_id', true);
    $auto_gerar_certificado = get_post_meta($post->ID, '_ap_quiz_auto_gerar_certificado', true);
    
    $aulas = get_posts(array('post_type' => 'ap_aula', 'numberposts' => -1));
    
    ?>
    <div class="academia-paygas-meta-box">
        <p>
            <label for="ap_quiz_aula_id"><?php _e('Aula:', 'academia-paygas'); ?></label>
            <select id="ap_quiz_aula_id" name="ap_quiz_aula_id" class="regular-text">
                <option value=""><?php _e('Seleccionar Aula', 'academia-paygas'); ?></option>
                <?php foreach ($aulas as $aula): ?>
                    <option value="<?php echo esc_attr($aula->ID); ?>" <?php selected($aula_id, $aula->ID); ?>>
                        <?php echo esc_html($aula->post_title); ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </p>
        <p>
            <label>
                <input type="checkbox" id="ap_quiz_auto_gerar_certificado" name="ap_quiz_auto_gerar_certificado" value="1" <?php checked($auto_gerar_certificado, '1'); ?>>
                <?php _e('Auto generar certificado al aprobar', 'academia-paygas'); ?>
            </label>
        </p>
    </div>
    <?php
}

function academia_paygas_quiz_perguntas_meta_box_callback($post) {
    $perguntas = get_post_meta($post->ID, '_ap_quiz_perguntas', true);
    if (!is_array($perguntas)) {
        $perguntas = array();
    }
    
    ?>
    <div class="academia-paygas-quiz-perguntas">
        <div id="ap_quiz_perguntas_container">
            <?php foreach ($perguntas as $index => $pergunta): ?>
                <div class="ap_quiz_pergunta_item" data-index="<?php echo esc_attr($index); ?>">
                    <p>
                        <label><?php _e('Pregunta:', 'academia-paygas'); ?></label>
                        <textarea name="ap_quiz_perguntas[<?php echo esc_attr($index); ?>][pergunta]" rows="2" class="large-text"><?php echo esc_textarea($pergunta['pergunta']); ?></textarea>
                    </p>
                    <p>
                        <label><?php _e('Opción A:', 'academia-paygas'); ?></label>
                        <input type="text" name="ap_quiz_perguntas[<?php echo esc_attr($index); ?>][opcao_a]" value="<?php echo esc_attr($pergunta['opcao_a']); ?>" class="regular-text">
                    </p>
                    <p>
                        <label><?php _e('Opción B:', 'academia-paygas'); ?></label>
                        <input type="text" name="ap_quiz_perguntas[<?php echo esc_attr($index); ?>][opcao_b]" value="<?php echo esc_attr($pergunta['opcao_b']); ?>" class="regular-text">
                    </p>
                    <p>
                        <label><?php _e('Opción C:', 'academia-paygas'); ?></label>
                        <input type="text" name="ap_quiz_perguntas[<?php echo esc_attr($index); ?>][opcao_c]" value="<?php echo esc_attr($pergunta['opcao_c']); ?>" class="regular-text">
                    </p>
                    <p>
                        <label><?php _e('Opción D:', 'academia-paygas'); ?></label>
                        <input type="text" name="ap_quiz_perguntas[<?php echo esc_attr($index); ?>][opcao_d]" value="<?php echo esc_attr($pergunta['opcao_d']); ?>" class="regular-text">
                    </p>
                    <p>
                        <label><?php _e('Correcta:', 'academia-paygas'); ?></label>
                        <select name="ap_quiz_perguntas[<?php echo esc_attr($index); ?>][correta]">
                            <option value="A" <?php selected($pergunta['correta'], 'A'); ?>>A</option>
                            <option value="B" <?php selected($pergunta['correta'], 'B'); ?>>B</option>
                            <option value="C" <?php selected($pergunta['correta'], 'C'); ?>>C</option>
                            <option value="D" <?php selected($pergunta['correta'], 'D'); ?>>D</option>
                        </select>
                    </p>
                    <p>
                        <label><?php _e('Orden:', 'academia-paygas'); ?></label>
                        <input type="number" name="ap_quiz_perguntas[<?php echo esc_attr($index); ?>][ordem]" value="<?php echo esc_attr($pergunta['ordem']); ?>" class="small-text">
                    </p>
                    <button type="button" class="button ap_quiz_remove_pergunta"><?php _e('Remover', 'academia-paygas'); ?></button>
                    <hr>
                </div>
            <?php endforeach; ?>
        </div>
        <button type="button" class="button" id="ap_quiz_add_pergunta"><?php _e('Adicionar Pregunta', 'academia-paygas'); ?></button>
    </div>
    <?php
}

add_action('save_post_ap_quiz', 'academia_paygas_save_quiz_meta_box');

function academia_paygas_save_quiz_meta_box($post_id) {
    if (!isset($_POST['academia_paygas_quiz_meta_box_nonce']) || !wp_verify_nonce($_POST['academia_paygas_quiz_meta_box_nonce'], 'academia_paygas_quiz_meta_box')) {
        return;
    }
    
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
        return;
    }
    
    if (!current_user_can('edit_post', $post_id)) {
        return;
    }
    
    if (isset($_POST['ap_quiz_aula_id'])) {
        update_post_meta($post_id, '_ap_quiz_aula_id', intval($_POST['ap_quiz_aula_id']));
    }
    
    if (isset($_POST['ap_quiz_auto_gerar_certificado'])) {
        update_post_meta($post_id, '_ap_quiz_auto_gerar_certificado', '1');
    } else {
        update_post_meta($post_id, '_ap_quiz_auto_gerar_certificado', '0');
    }
    
    if (isset($_POST['ap_quiz_perguntas'])) {
        $perguntas = array();
        foreach ($_POST['ap_quiz_perguntas'] as $pergunta_data) {
            if (!empty($pergunta_data['pergunta'])) {
                $perguntas[] = array(
                    'pergunta' => sanitize_textarea_field($pergunta_data['pergunta']),
                    'opcao_a' => sanitize_text_field($pergunta_data['opcao_a']),
                    'opcao_b' => sanitize_text_field($pergunta_data['opcao_b']),
                    'opcao_c' => sanitize_text_field($pergunta_data['opcao_c']),
                    'opcao_d' => sanitize_text_field($pergunta_data['opcao_d']),
                    'correta' => sanitize_text_field($pergunta_data['correta']),
                    'ordem' => intval($pergunta_data['ordem']),
                );
            }
        }
        update_post_meta($post_id, '_ap_quiz_perguntas', $perguntas);
    }
}

/**
 * Agregar meta boxes para Certificate (actualizado para usar taxonomía)
 */
add_action('add_meta_boxes', 'academia_paygas_certificate_meta_boxes');

function academia_paygas_certificate_meta_boxes() {
    add_meta_box(
        'ap_certificate_details',
        __('Detalles del Certificado', 'academia-paygas'),
        'academia_paygas_certificate_meta_box_callback',
        'ap_certificate',
        'normal',
        'high'
    );
}

function academia_paygas_certificate_meta_box_callback($post) {
    wp_nonce_field('academia_paygas_certificate_meta_box', 'academia_paygas_certificate_meta_box_nonce');
    
    $user_id = get_post_meta($post->ID, '_ap_certificate_user_id', true);
    $trilha_id = get_post_meta($post->ID, '_ap_certificate_trilha_id', true);
    $status = get_post_meta($post->ID, '_ap_certificate_status', true);
    $pdf_url = get_post_meta($post->ID, '_ap_certificate_pdf_url', true);
    $aprovado_por = get_post_meta($post->ID, '_ap_certificate_aprovado_por', true);
    $aprovado_em = get_post_meta($post->ID, '_ap_certificate_aprovado_em', true);
    
    $users = get_users(array('role__in' => array('academia_admin', 'academia_gestor', 'academia_atendente')));
    $trilhas = get_terms(array('taxonomy' => 'ap_trilha', 'hide_empty' => false));
    
    ?>
    <div class="academia-paygas-meta-box">
        <p>
            <label for="ap_certificate_user_id"><?php _e('Usuario:', 'academia-paygas'); ?></label>
            <select id="ap_certificate_user_id" name="ap_certificate_user_id" class="regular-text">
                <option value=""><?php _e('Seleccionar Usuario', 'academia-paygas'); ?></option>
                <?php foreach ($users as $user): ?>
                    <option value="<?php echo esc_attr($user->ID); ?>" <?php selected($user_id, $user->ID); ?>>
                        <?php echo esc_html($user->display_name); ?> (<?php echo esc_html($user->user_email); ?>)
                    </option>
                <?php endforeach; ?>
            </select>
        </p>
        <p>
            <label for="ap_certificate_trilha_id"><?php _e('Trilha:', 'academia-paygas'); ?></label>
            <select id="ap_certificate_trilha_id" name="ap_certificate_trilha_id" class="regular-text">
                <option value=""><?php _e('Seleccionar Trilha', 'academia-paygas'); ?></option>
                <?php foreach ($trilhas as $trilha): ?>
                    <option value="<?php echo esc_attr($trilha->term_id); ?>" <?php selected($trilha_id, $trilha->term_id); ?>>
                        <?php echo esc_html($trilha->name); ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </p>
        <p>
            <label for="ap_certificate_status"><?php _e('Estado:', 'academia-paygas'); ?></label>
            <select id="ap_certificate_status" name="ap_certificate_status" class="regular-text">
                <option value="pending" <?php selected($status, 'pending'); ?>><?php _e('Pendiente', 'academia-paygas'); ?></option>
                <option value="approved" <?php selected($status, 'approved'); ?>><?php _e('Aprobado', 'academia-paygas'); ?></option>
                <option value="issued" <?php selected($status, 'issued'); ?>><?php _e('Emitido', 'academia-paygas'); ?></option>
            </select>
        </p>
        <p>
            <label for="ap_certificate_pdf_url"><?php _e('URL del PDF:', 'academia-paygas'); ?></label>
            <input type="url" id="ap_certificate_pdf_url" name="ap_certificate_pdf_url" value="<?php echo esc_url($pdf_url); ?>" class="regular-text">
        </p>
        <p>
            <label for="ap_certificate_aprovado_por"><?php _e('Aprobado por:', 'academia-paygas'); ?></label>
            <input type="text" id="ap_certificate_aprovado_por" name="ap_certificate_aprovado_por" value="<?php echo esc_attr($aprovado_por); ?>" class="regular-text">
        </p>
        <p>
            <label for="ap_certificate_aprovado_em"><?php _e('Aprobado en:', 'academia-paygas'); ?></label>
            <input type="datetime-local" id="ap_certificate_aprovado_em" name="ap_certificate_aprovado_em" value="<?php echo esc_attr($aprovado_em); ?>" class="regular-text">
        </p>
    </div>
    <?php
}

add_action('save_post_ap_certificate', 'academia_paygas_save_certificate_meta_box');

function academia_paygas_save_certificate_meta_box($post_id) {
    if (!isset($_POST['academia_paygas_certificate_meta_box_nonce']) || !wp_verify_nonce($_POST['academia_paygas_certificate_meta_box_nonce'], 'academia_paygas_certificate_meta_box')) {
        return;
    }
    
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
        return;
    }
    
    if (!current_user_can('edit_post', $post_id)) {
        return;
    }
    
    if (isset($_POST['ap_certificate_user_id'])) {
        update_post_meta($post_id, '_ap_certificate_user_id', intval($_POST['ap_certificate_user_id']));
    }
    
    if (isset($_POST['ap_certificate_trilha_id'])) {
        update_post_meta($post_id, '_ap_certificate_trilha_id', intval($_POST['ap_certificate_trilha_id']));
    }
    
    if (isset($_POST['ap_certificate_status'])) {
        update_post_meta($post_id, '_ap_certificate_status', sanitize_text_field($_POST['ap_certificate_status']));
    }
    
    if (isset($_POST['ap_certificate_pdf_url'])) {
        update_post_meta($post_id, '_ap_certificate_pdf_url', esc_url_raw($_POST['ap_certificate_pdf_url']));
    }
    
    if (isset($_POST['ap_certificate_aprovado_por'])) {
        update_post_meta($post_id, '_ap_certificate_aprovado_por', sanitize_text_field($_POST['ap_certificate_aprovado_por']));
    }
    
    if (isset($_POST['ap_certificate_aprovado_em'])) {
        update_post_meta($post_id, '_ap_certificate_aprovado_em', sanitize_text_field($_POST['ap_certificate_aprovado_em']));
    }
}

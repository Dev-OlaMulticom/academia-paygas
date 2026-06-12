<?php
if (!defined('ABSPATH')) exit;

class Academia_Docs {

    public function register_routes(): void {
        register_rest_route(ACADEMIA_PAYGAS_NAMESPACE, '/docs', [
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => [$this, 'get_docs'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route(ACADEMIA_PAYGAS_NAMESPACE, '/docs/json', [
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => [$this, 'get_docs_json'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route(ACADEMIA_PAYGAS_NAMESPACE, '/docs/html', [
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => [$this, 'get_docs_html'],
            'permission_callback' => '__return_true',
        ]);
    }

    public function get_docs(WP_REST_Request $request): WP_REST_Response {
        $format = $request->get_param('format');

        if ($format === 'html') {
            return $this->get_docs_html($request);
        }

        return $this->get_docs_json($request);
    }

    public function get_docs_json(WP_REST_Request $request): WP_REST_Response {
        $base = rest_url('academia-paygas/v1');

        $endpoints = [
            ['method' => 'GET',  'path' => '/users',               'auth' => true,  'summary' => 'Listar usuarios'],
            ['method' => 'GET',  'path' => '/users/{id}',          'auth' => true,  'summary' => 'Obtener usuario'],
            ['method' => 'POST', 'path' => '/users',               'auth' => true,  'summary' => 'Crear usuario'],
            ['method' => 'PUT',  'path' => '/users/{id}',          'auth' => true,  'summary' => 'Actualizar usuario'],
            ['method' => 'DELETE','path' => '/users/{id}',         'auth' => true,  'summary' => 'Eliminar usuario'],
            ['method' => 'GET',  'path' => '/trilhas',             'auth' => true,  'summary' => 'Listar trilhas'],
            ['method' => 'GET',  'path' => '/trilhas/{id}',        'auth' => true,  'summary' => 'Obtener trilha'],
            ['method' => 'POST', 'path' => '/trilhas',             'auth' => true,  'summary' => 'Crear trilha'],
            ['method' => 'PUT',  'path' => '/trilhas/{id}',        'auth' => true,  'summary' => 'Actualizar trilha'],
            ['method' => 'DELETE','path' => '/trilhas/{id}',       'auth' => true,  'summary' => 'Eliminar trilha'],
            ['method' => 'GET',  'path' => '/modulos',             'auth' => true,  'summary' => 'Listar modulos'],
            ['method' => 'GET',  'path' => '/modulos/{id}',        'auth' => true,  'summary' => 'Obtener modulo'],
            ['method' => 'POST', 'path' => '/modulos',             'auth' => true,  'summary' => 'Crear modulo'],
            ['method' => 'PUT',  'path' => '/modulos/{id}',        'auth' => true,  'summary' => 'Actualizar modulo'],
            ['method' => 'DELETE','path' => '/modulos/{id}',       'auth' => true,  'summary' => 'Eliminar modulo'],
            ['method' => 'GET',  'path' => '/aulas',               'auth' => true,  'summary' => 'Listar aulas'],
            ['method' => 'GET',  'path' => '/aulas/{id}',          'auth' => true,  'summary' => 'Obtener aula'],
            ['method' => 'POST', 'path' => '/aulas',               'auth' => true,  'summary' => 'Crear aula'],
            ['method' => 'PUT',  'path' => '/aulas/{id}',          'auth' => true,  'summary' => 'Actualizar aula'],
            ['method' => 'DELETE','path' => '/aulas/{id}',         'auth' => true,  'summary' => 'Eliminar aula'],
            ['method' => 'GET',  'path' => '/quizzes',             'auth' => true,  'summary' => 'Listar quizzes'],
            ['method' => 'GET',  'path' => '/quizzes/{id}',        'auth' => true,  'summary' => 'Obtener quiz'],
            ['method' => 'POST', 'path' => '/quizzes',             'auth' => true,  'summary' => 'Crear quiz'],
            ['method' => 'PUT',  'path' => '/quizzes/{id}',        'auth' => true,  'summary' => 'Actualizar quiz'],
            ['method' => 'DELETE','path' => '/quizzes/{id}',       'auth' => true,  'summary' => 'Eliminar quiz'],
            ['method' => 'GET',  'path' => '/quiz-responses',      'auth' => true,  'summary' => 'Listar respuestas'],
            ['method' => 'POST', 'path' => '/quiz-responses',      'auth' => true,  'summary' => 'Crear respuesta'],
            ['method' => 'GET',  'path' => '/certificados',        'auth' => true,  'summary' => 'Listar certificados'],
            ['method' => 'GET',  'path' => '/certificados/{id}',   'auth' => true,  'summary' => 'Obtener certificado'],
            ['method' => 'POST', 'path' => '/certificados',        'auth' => true,  'summary' => 'Crear certificado'],
            ['method' => 'PUT',  'path' => '/certificados/{id}',   'auth' => true,  'summary' => 'Actualizar certificado'],
            ['method' => 'GET',  'path' => '/notifications',       'auth' => true,  'summary' => 'Listar notificaciones'],
            ['method' => 'POST', 'path' => '/notifications',       'auth' => true,  'summary' => 'Crear notificacion'],
            ['method' => 'PUT',  'path' => '/notifications/{id}',  'auth' => true,  'summary' => 'Marcar notificacion'],
            ['method' => 'GET',  'path' => '/activity-logs',       'auth' => true,  'summary' => 'Listar logs'],
            ['method' => 'POST', 'path' => '/activity-logs',       'auth' => true,  'summary' => 'Crear log'],
            ['method' => 'GET',  'path' => '/trilha-atendente',    'auth' => true,  'summary' => 'Listar asignaciones'],
            ['method' => 'POST', 'path' => '/trilha-atendente',    'auth' => true,  'summary' => 'Asignar trilha'],
            ['method' => 'DELETE','path' => '/trilha-atendente/{id}','auth' => true, 'summary' => 'Eliminar asignacion'],
            ['method' => 'GET',  'path' => '/progresso',           'auth' => true,  'summary' => 'Listar progreso'],
            ['method' => 'POST', 'path' => '/progresso',           'auth' => true,  'summary' => 'Crear progreso'],
            ['method' => 'PUT',  'path' => '/progresso/{id}',      'auth' => true,  'summary' => 'Actualizar progreso'],
        ];

        $data = [
            'version'  => ACADEMIA_PAYGAS_VERSION,
            'base_url' => $base,
            'auth'     => [
                'type'        => 'api_key',
                'header'      => 'X-API-Key',
                'description' => 'Enviar API Key en header X-API-Key o query param api_key',
            ],
            'endpoints' => $endpoints,
        ];

        return new WP_REST_Response($data, 200);
    }

    public function get_docs_html(WP_REST_Request $request): WP_REST_Response {
        $json = $this->get_docs_json($request)->get_data();
        $base = $json['base_url'];

        ob_start();
        ?>
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>API Docs - Academia PayGas</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; color: #333; line-height: 1.6; }
                .container { max-width: 900px; margin: 0 auto; padding: 20px; }
                h1 { font-size: 28px; margin-bottom: 8px; color: #1d2327; }
                .version { color: #646970; font-size: 14px; margin-bottom: 24px; }
                .auth-box { background: #fff; border: 1px solid #ccd0d4; border-radius: 4px; padding: 20px; margin-bottom: 24px; }
                .auth-box h2 { font-size: 18px; margin-bottom: 12px; }
                .auth-box code { background: #f6f7f7; padding: 2px 6px; border-radius: 3px; font-size: 13px; }
                .endpoint { background: #fff; border: 1px solid #ccd0d4; border-radius: 4px; margin-bottom: 8px; overflow: hidden; }
                .endpoint-header { padding: 12px 16px; display: flex; align-items: center; gap: 12px; cursor: pointer; }
                .endpoint-header:hover { background: #f9f9f9; }
                .method { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 12px; font-weight: 600; color: #fff; min-width: 60px; text-align: center; }
                .method-get { background: #2271b1; }
                .method-post { background: #00a32a; }
                .method-put { default: #dba617; background: #dba617; color: #1d2327; }
                .method-delete { background: #d63638; }
                .path { font-family: monospace; font-size: 14px; }
                .summary { color: #646970; font-size: 13px; margin-left: auto; }
                .auth-badge { font-size: 11px; padding: 1px 6px; border-radius: 3px; background: #f0f6fc; color: #2271b1; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Academia PayGas API</h1>
                <p class="version">Version: <?php echo esc_html($json['version']); ?></p>

                <div class="auth-box">
                    <h2>Autenticacion</h2>
                    <p>Tipo: <strong>API Key</strong></p>
                    <p>Header: <code>X-API-Key: tu-api-key</code></p>
                    <p>Query: <code>?api_key=tu-api-key</code></p>
                </div>

                <h2 style="margin-bottom: 12px;">Endpoints</h2>

                <?php foreach ($json['endpoints'] as $ep): ?>
                <div class="endpoint">
                    <div class="endpoint-header">
                        <span class="method method-<?php echo strtolower($ep['method']); ?>"><?php echo esc_html($ep['method']); ?></span>
                        <span class="path"><?php echo esc_html($ep['path']); ?></span>
                        <span class="summary"><?php echo esc_html($ep['summary']); ?></span>
                        <?php if ($ep['auth']): ?>
                            <span class="auth-badge">Auth</span>
                        <?php endif; ?>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>
        </body>
        </html>
        <?php
        $html = ob_get_clean();

        $response = new WP_REST_Response($html, 200);
        $response->header('Content-Type', 'text/html; charset=UTF-8');
        return $response;
    }
}

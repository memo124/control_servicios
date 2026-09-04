-- Views for dynamic state evaluation (no CASE WHEN in application code)
DROP VIEW IF EXISTS v_suscripciones_detalle;
DROP VIEW IF EXISTS v_balance_financiero;

CREATE VIEW v_suscripciones_detalle AS
SELECT 
    s.id AS suscripcion_id,
    c.id AS cliente_id,
    cp.id AS cuenta_id,
    c.nombre AS cliente_nombre,
    c.email AS cliente_email,
    c.desea_notificaciones_correo,
    p.nombre AS plataforma,
    cp.identificador AS cuenta_identificador,
    cp.dueno_nombre AS dueno_cuenta,
    s.perfil_nombre,
    s.precio_cobro,
    s.fecha_corte,
    s.aplica_gracia,
    s.dias_gracia,
    s.activo,
    calc.fecha_limite_gracia,
    calc.dias_vencido,
    calc.dias_gracia_restantes,
    est.codigo AS estado_codigo,
    est.nombre AS estado_nombre,
    est.permite_acceso,
    est.color_hex
FROM suscripciones_clientes s
JOIN clientes c ON c.id = s.cliente_id
JOIN cuentas_plataforma cp ON cp.id = s.cuenta_id
JOIN plataformas p ON p.id = cp.plataforma_id
CROSS JOIN LATERAL (
    SELECT 
        (CURRENT_DATE - s.fecha_corte) AS dias_vencido,
        (s.fecha_corte + ((s.aplica_gracia::int * s.dias_gracia) * INTERVAL '1 day'))::date AS fecha_limite_gracia,
        ((s.fecha_corte + ((s.aplica_gracia::int * s.dias_gracia) * INTERVAL '1 day'))::date - CURRENT_DATE) AS dias_gracia_restantes
) calc
CROSS JOIN LATERAL (
    SELECT e.codigo, e.nombre, e.permite_acceso, e.color_hex
    FROM estados_reglas r
    JOIN estados e ON e.id = r.estado_id
    WHERE r.activo = TRUE
      AND (r.requiere_gracia_activa = FALSE OR (r.requiere_gracia_activa = TRUE AND s.aplica_gracia = TRUE))
      AND calc.dias_vencido BETWEEN r.dias_vencido_min AND r.dias_vencido_max
      AND calc.dias_gracia_restantes BETWEEN r.dias_gracia_restantes_min AND r.dias_gracia_restantes_max
    ORDER BY r.prioridad ASC
    LIMIT 1
) est;

CREATE VIEW v_balance_financiero AS
WITH resumen_cuenta AS (
    SELECT 
        cp.id AS cuenta_id,
        p.id AS plataforma_id,
        p.nombre AS plataforma,
        cp.identificador AS cuenta,
        cp.dueno_nombre AS dueno_cuenta,
        cp.costo_mensual AS costo_pagado_dueno,
        COALESCE(SUM(sc.precio_cobro), 0.00) AS total_cobrado_clientes,
        COUNT(sc.id) AS total_perfiles_vendidos,
        (COALESCE(SUM(sc.precio_cobro), 0.00) - cp.costo_mensual) AS ganancia_neta_cuenta
    FROM cuentas_plataforma cp
    JOIN plataformas p ON p.id = cp.plataforma_id
    LEFT JOIN suscripciones_clientes sc ON sc.cuenta_id = cp.id AND sc.activo = TRUE
    WHERE cp.activo = TRUE
    GROUP BY cp.id, p.id, p.nombre, cp.identificador, cp.dueno_nombre, cp.costo_mensual
)
SELECT 
    cuenta_id,
    plataforma_id,
    plataforma,
    cuenta,
    dueno_cuenta,
    costo_pagado_dueno,
    total_cobrado_clientes,
    total_perfiles_vendidos,
    ganancia_neta_cuenta,
    SUM(costo_pagado_dueno) OVER (PARTITION BY plataforma_id) AS costo_acumulado_plataforma,
    SUM(total_cobrado_clientes) OVER (PARTITION BY plataforma_id) AS cobro_acumulado_plataforma,
    SUM(ganancia_neta_cuenta) OVER (PARTITION BY plataforma_id) AS ganancia_acumulada_plataforma
FROM resumen_cuenta;

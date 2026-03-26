-- Inicialización del Catálogo "Bien Sentado"
-- Ejecutar en el SQL Editor de Supabase después de haber creado la estructura base (schema.sql)

INSERT INTO productos (nombre, categoria, precio_referencia, stock_actual) VALUES
('Silla Eames', 'Sillas', 0.00, 0),
('Silla Tulip', 'Sillas', 0.00, 0),
('Silla Milán', 'Sillas', 0.00, 0),
('Silla Gruvyer', 'Sillas', 0.00, 0),
('Silla Saarinen', 'Sillas', 0.00, 0),
('Silla Plia', 'Sillas', 0.00, 0),
('Silla Máster', 'Sillas', 0.00, 0),

('Mesa Eames Rectangular (120x80cm)', 'Mesas', 0.00, 0),
('Mesa Eames Rectangular (140x80cm)', 'Mesas', 0.00, 0),
('Mesa Eames redonda', 'Mesas', 0.00, 0),
('Mesa Eames cuadrada', 'Mesas', 0.00, 0),
('Mesa Tulip', 'Mesas', 0.00, 0),
('Mesa Rock', 'Mesas', 0.00, 0),
('Mesa Ratan', 'Mesas', 0.00, 0),

('Combo Ratan', 'Combos', 0.00, 0),
('Combo | Mesa Tulip + 4 Sillas Tulip', 'Combos', 0.00, 0);

-- Opcional: Verificación visual de los inserts
SELECT * FROM productos;

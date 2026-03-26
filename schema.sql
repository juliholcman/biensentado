-- ==============================================================================
-- BASE DE DATOS: BIEN SENTADO
-- MOTOR RECOMENDADO: PostgreSQL
-- ==============================================================================

-- Habilitar extensión para generar UUIDs nativos (gen_random_uuid está integrado en PG 13+)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. TABLA: PRODUCTOS
-- ------------------------------------------------------------------------------
-- Propósito: Catálogo maestro y visualización rápida del stock actualizado.
CREATE TABLE productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(255) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    precio_referencia DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    stock_actual INT NOT NULL DEFAULT 0,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- RESTRICCIÓN CRÍTICA: La base de datos abortará cualquier transacción 
    -- que intente restar productos por debajo de 0.
    CONSTRAINT chk_stock_no_negativo CHECK (stock_actual >= 0)
);

-- ------------------------------------------------------------------------------
-- 2. TABLA: OPERACIONES_CAJA
-- ------------------------------------------------------------------------------
-- Propósito: Reemplaza la funcionalidad de tu frontend actual, guardando el dinero real.
CREATE TABLE operaciones_caja (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_operacion VARCHAR(20) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    concepto TEXT NOT NULL,
    monto DECIMAL(12, 2) NOT NULL,
    medio_pago VARCHAR(50) NOT NULL,
    fecha_operacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_tipo_op CHECK (tipo_operacion IN ('INGRESO', 'EGRESO')),
    CONSTRAINT chk_monto_positivo CHECK (monto > 0)
);

-- ------------------------------------------------------------------------------
-- 3. TABLA: MOVIMIENTOS_STOCK
-- ------------------------------------------------------------------------------
-- Propósito: Historial inmutable de entradas y salidas de mercadería.
CREATE TABLE movimientos_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id UUID NOT NULL,
    operacion_caja_id UUID, -- Opcional: Permite enlazar una Venta (Caja) con su Egreso de Stock
    tipo_movimiento VARCHAR(20) NOT NULL,
    cantidad INT NOT NULL,
    detalle TEXT,
    fecha_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_tipo_mov CHECK (tipo_movimiento IN ('INGRESO', 'EGRESO')),
    CONSTRAINT chk_cantidad_positiva CHECK (cantidad > 0),
    
    -- Foreign Keys
    CONSTRAINT fk_producto 
        FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE RESTRICT,
    CONSTRAINT fk_operacion_caja 
        FOREIGN KEY (operacion_caja_id) REFERENCES operaciones_caja(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------------------------
-- 4. TRIGGER Y FUNCIÓN: AUTOMATIZACIÓN DE STOCK
-- ------------------------------------------------------------------------------
-- Propósito: Al insertar un movimiento, se actualiza la tabla de Productos mágicamente.
-- Si el resultado da stock negativo, la "Constraint" de la tabla Productos bloquea todo.

CREATE OR REPLACE FUNCTION actualizar_stock_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tipo_movimiento = 'INGRESO' THEN
        -- Suman artículos nuevos (Compra a proveedores o ajuste)
        UPDATE productos 
        SET stock_actual = stock_actual + NEW.cantidad 
        WHERE id = NEW.producto_id;
        
    ELSIF NEW.tipo_movimiento = 'EGRESO' THEN
        -- Restan artículos (Venta al cliente o producto dañado)
        UPDATE productos 
        SET stock_actual = stock_actual - NEW.cantidad 
        WHERE id = NEW.producto_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Asignar el Trigger
CREATE TRIGGER trg_movimientos_stock
AFTER INSERT ON movimientos_stock
FOR EACH ROW
EXECUTE FUNCTION actualizar_stock_trigger();

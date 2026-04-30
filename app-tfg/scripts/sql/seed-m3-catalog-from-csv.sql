BEGIN;

-- Seed inicial de catalogo M3 desde el CSV proporcionado por negocio.
-- Requiere que las migraciones M3 esten aplicadas, incluida la 023 de subcategory.

WITH active_status AS (
    SELECT id
    FROM product_statuses
    WHERE code = 'active'
    LIMIT 1
),
upsert_categories AS (
    INSERT INTO product_categories (name, description, display_order)
    VALUES
    ('COLORACION', 'Carga inicial desde CSV comercial', 0),
    ('FORMA', 'Carga inicial desde CSV comercial', 1),
    ('ALTO RENDIMIENTO', 'Carga inicial desde CSV comercial', 2),
    ('ACABADO', 'Carga inicial desde CSV comercial', 3),
    ('HOMBRE', 'Carga inicial desde CSV comercial', 4),
    ('CUIDADO CAPILAR', 'Carga inicial desde CSV comercial', 5)
    ON CONFLICT (name) DO UPDATE
    SET description = EXCLUDED.description,
        display_order = EXCLUDED.display_order
    RETURNING id, name
),
all_categories AS (
    SELECT id, name FROM upsert_categories
    UNION
    SELECT id, name
    FROM product_categories
    WHERE name IN (SELECT name FROM upsert_categories)
),
upsert_lines AS (
    INSERT INTO product_lines (name, product_category_id, description, image_url, display_order)
    SELECT
        src.name,
        category.id,
        src.description,
        NULL,
        src.display_order
    FROM (
        VALUES
    ('KINCREM COLOR', 'COLORACION', 'Linea comercial importada desde CSV', 0),
    ('KINESSENCES COLOR', 'COLORACION', 'Linea comercial importada desde CSV', 1),
    ('KINGLOSS COLOR', 'COLORACION', 'Linea comercial importada desde CSV', 2),
    ('CANDY COLORS', 'COLORACION', 'Linea comercial importada desde CSV', 3),
    ('KINBLOND', 'COLORACION', 'Linea comercial importada desde CSV', 4),
    ('KINMASTER', 'COLORACION', 'Linea comercial importada desde CSV', 5),
    ('KINPERM', 'FORMA', 'Linea comercial importada desde CSV', 0),
    ('KINSMOOTH', 'FORMA', 'Linea comercial importada desde CSV', 1),
    ('KINWORKS', 'ALTO RENDIMIENTO', 'Linea comercial importada desde CSV', 0),
    ('HAUTE BY KINSTYLE', 'ACABADO', 'Linea comercial importada desde CSV', 0),
    ('KINSTYLE', 'ACABADO', 'Linea comercial importada desde CSV', 1),
    ('KINMEN', 'HOMBRE', 'Linea comercial importada desde CSV', 0),
    ('KINACTIF', 'CUIDADO CAPILAR', 'Linea comercial importada desde CSV', 0),
    ('KINESSENCES CARE', 'CUIDADO CAPILAR', 'Linea comercial importada desde CSV', 1)
    ) AS src(name, category_name, description, display_order)
    INNER JOIN all_categories category
        ON category.name = src.category_name
    ON CONFLICT (name) DO UPDATE
    SET product_category_id = EXCLUDED.product_category_id,
        description = EXCLUDED.description,
        display_order = EXCLUDED.display_order
    RETURNING id, name, product_category_id
),
all_lines AS (
    SELECT id, name, product_category_id FROM upsert_lines
    UNION
    SELECT id, name, product_category_id
    FROM product_lines
    WHERE name IN (SELECT name FROM upsert_lines)
),
upsert_products AS (
    INSERT INTO products (
        reference,
        name,
        description,
        subcategory,
        product_category_id,
        product_line_id,
        image_url,
        technical_info,
        status_id,
        base_price,
        supplier
    )
    SELECT
        src.reference,
        src.name,
        src.description,
        src.subcategory,
        category.id,
        product_line.id,
        src.image_url,
        src.technical_info,
        status.id,
        src.base_price,
        src.supplier
    FROM (
        VALUES
    ('PENDING-CODE-0001', 'Permanent Beauty Coloring', NULL, NULL, 'COLORACION', 'KINCREM COLOR', NULL, 'Formato: 3 x 100 ml
Packing: 12
Referencia provisional generada en la importacion. Sustituir cuando se disponga del codigo real.', 44.40, NULL, 1),
    ('502121', 'Active Cream Oxidant 10 Vol.', NULL, NULL, 'COLORACION', 'KINCREM COLOR', NULL, 'Formato: 1.000 ml
Packing: 6', 15.13, NULL, 2),
    ('502122', 'Active Cream Oxidant 20 Vol.', NULL, NULL, 'COLORACION', 'KINCREM COLOR', NULL, 'Formato: 1.000 ml
Packing: 6', 15.13, NULL, 3),
    ('502123', 'Active Cream Oxidant 30 Vol.', NULL, NULL, 'COLORACION', 'KINCREM COLOR', NULL, 'Formato: 1.000 ml
Packing: 6', 15.13, NULL, 4),
    ('502124', 'Active Cream Oxidant 40 Vol.', NULL, NULL, 'COLORACION', 'KINCREM COLOR', NULL, 'Formato: 1.000 ml
Packing: 6', 15.13, NULL, 5),
    ('502125', 'Active Cream Oxidant 10 Vol.', NULL, NULL, 'COLORACION', 'KINCREM COLOR', NULL, 'Formato: 100 ml
Packing: 36', 3.39, NULL, 6),
    ('502126', 'Active Cream Oxidant 20 Vol.', NULL, NULL, 'COLORACION', 'KINCREM COLOR', NULL, 'Formato: 100 ml
Packing: 36', 3.39, NULL, 7),
    ('502127', 'Active Cream Oxidant 30 Vol.', NULL, NULL, 'COLORACION', 'KINCREM COLOR', NULL, 'Formato: 100 ml
Packing: 36', 3.39, NULL, 8),
    ('502128', 'Active Cream Oxidant 40 Vol.', NULL, NULL, 'COLORACION', 'KINCREM COLOR', NULL, 'Formato: 100 ml
Packing: 36', 3.39, NULL, 9),
    ('PENDING-CODE-0010', 'Ammonia-Free Coloring', NULL, NULL, 'COLORACION', 'KINESSENCES COLOR', NULL, 'Formato: 3 x 100 ml
Packing: 12
Referencia provisional generada en la importacion. Sustituir cuando se disponga del codigo real.', 44.40, NULL, 10),
    ('513169', 'Active Cream Developer 6 Vol.', NULL, NULL, 'COLORACION', 'KINESSENCES COLOR', NULL, 'Formato: 1.000 ml
Packing: 6', 15.13, NULL, 11),
    ('513170', 'Active Cream Developer 12 Vol.', NULL, NULL, 'COLORACION', 'KINESSENCES COLOR', NULL, 'Formato: 1.000 ml
Packing: 6', 15.13, NULL, 12),
    ('513171', 'Active Cream Developer 24 Vol.', NULL, NULL, 'COLORACION', 'KINESSENCES COLOR', NULL, 'Formato: 1.000 ml
Packing: 6', 15.13, NULL, 13),
    ('513172', 'Active Cream Developer 36 Vol.', NULL, NULL, 'COLORACION', 'KINESSENCES COLOR', NULL, 'Formato: 1.000 ml
Packing: 6', 15.13, NULL, 14),
    ('513173', 'Active Cream Developer 6 Vol.', NULL, NULL, 'COLORACION', 'KINESSENCES COLOR', NULL, 'Formato: 100 ml
Packing: 36', 3.39, NULL, 15),
    ('513174', 'Active Cream Developer 12 Vol.', NULL, NULL, 'COLORACION', 'KINESSENCES COLOR', NULL, 'Formato: 100 ml
Packing: 36', 3.39, NULL, 16),
    ('513175', 'Active Cream Developer 24 Vol.', NULL, NULL, 'COLORACION', 'KINESSENCES COLOR', NULL, 'Formato: 100 ml
Packing: 36', 3.39, NULL, 17),
    ('513176', 'Active Cream Developer 36 Vol.', NULL, NULL, 'COLORACION', 'KINESSENCES COLOR', NULL, 'Formato: 100 ml
Packing: 36', 3.39, NULL, 18),
    ('PENDING-CODE-0019', 'Super Shine Hair Coloring', NULL, NULL, 'COLORACION', 'KINGLOSS COLOR', NULL, 'Formato: 50 ml
Packing: 12
Referencia provisional generada en la importacion. Sustituir cuando se disponga del codigo real.', 12.00, NULL, 19),
    ('560020', 'Brush & Bottle Active Developer 5 Vol.', NULL, NULL, 'COLORACION', 'KINGLOSS COLOR', NULL, 'Formato: 1.000 ml
Packing: 6', 15.13, NULL, 20),
    ('560021', 'Brush & Bottle Active Developer 5 Vol.', NULL, NULL, 'COLORACION', 'KINGLOSS COLOR', NULL, 'Formato: 100 ml
Packing: 36', 3.39, NULL, 21),
    ('PENDING-CODE-0022', 'Candy Colors', NULL, NULL, 'COLORACION', 'CANDY COLORS', NULL, 'Formato: 200 ml
Packing: 6
Referencia provisional generada en la importacion. Sustituir cuando se disponga del codigo real.', 19.66, NULL, 22),
    ('500811', 'Candy Colors Shampoo', NULL, NULL, 'COLORACION', 'CANDY COLORS', NULL, 'Formato: 200 ml
Packing: 6', 13.14, NULL, 23),
    ('501202', '8 Flexible Lightening Powder', NULL, NULL, 'COLORACION', 'KINBLOND', NULL, 'Formato: 500 g
Packing: 6', 54.59, NULL, 24),
    ('501201', '9 Advanced Lightening Powder', NULL, NULL, 'COLORACION', 'KINBLOND', NULL, 'Formato: 500 g
Packing: 6', 54.59, NULL, 25),
    ('501204', 'Active Protective Oxidant 7 Vol.', NULL, NULL, 'COLORACION', 'KINBLOND', NULL, 'Formato: 1.000 ml
Packing: 6', 15.13, NULL, 26),
    ('501205', 'Active Protective Oxidant 7 Vol.', NULL, NULL, 'COLORACION', 'KINBLOND', NULL, 'Formato: 100 ml
Packing: 36', 3.39, NULL, 27),
    ('501207', 'Pack Sachets 8 Flexible Lightening Powder', NULL, NULL, 'COLORACION', 'KINBLOND', NULL, 'Formato: 10 x 50 g
Packing: 6', 64.89, NULL, 28),
    ('501206', 'Pack Sachets 9 Advanced Lightening Powder', NULL, NULL, 'COLORACION', 'KINBLOND', NULL, 'Formato: 10 x 50 g
Packing: 6', 64.89, NULL, 29),
    ('540056', 'Equilibrant Shampoo', NULL, NULL, 'COLORACION', 'KINMASTER', NULL, 'Formato: 1000 ml
Packing: 6', 35.53, NULL, 30),
    ('540057', 'Deep Cleansing Shampoo', NULL, NULL, 'COLORACION', 'KINMASTER', NULL, 'Formato: 1000 ml
Packing: 6', 35.53, NULL, 31),
    ('540090', 'Deep Cleansing Shampoo', NULL, NULL, 'COLORACION', 'KINMASTER', NULL, 'Formato: 250 ml
Packing: 6', 12.87, NULL, 32),
    ('540058', 'Color Cleanser', NULL, NULL, 'COLORACION', 'KINMASTER', NULL, 'Formato: 75 ml
Packing: 6', 10.47, NULL, 33),
    ('540099', 'Color Remover', NULL, NULL, 'COLORACION', 'KINMASTER', NULL, 'Formato: 2 x 50 ml
Packing: 6', 20.01, NULL, 34),
    ('540064', 'No Yellow Shampoo', NULL, NULL, 'COLORACION', 'KINMASTER', NULL, 'Formato: 1000 ml
Packing: 6', 35.53, NULL, 35),
    ('540079', 'No Yellow Shampoo', NULL, NULL, 'COLORACION', 'KINMASTER', NULL, 'Formato: 250 ml
Packing: 6', 12.87, NULL, 36),
    ('540080', 'No Orange Shampoo', NULL, NULL, 'COLORACION', 'KINMASTER', NULL, 'Formato: 1000 ml
Packing: 6', 35.53, NULL, 37),
    ('540082', 'No Orange Shampoo', NULL, NULL, 'COLORACION', 'KINMASTER', NULL, 'Formato: 250 ml
Packing: 6', 12.87, NULL, 38),
    ('540083', 'Shaping Lotion Nº 0', NULL, NULL, 'FORMA', 'KINPERM', NULL, 'Formato: 80 ml
Packing: 6', 80.82, NULL, 39),
    ('540084', 'Shaping Lotion Nº 1', NULL, NULL, 'FORMA', 'KINPERM', NULL, 'Formato: 80 ml
Packing: 6', 80.82, NULL, 40),
    ('540085', 'Shaping Lotion Nº 2', NULL, NULL, 'FORMA', 'KINPERM', NULL, 'Formato: 80 ml
Packing: 6', 80.82, NULL, 41),
    ('540086', 'Shaping Lotion Nº 3', NULL, NULL, 'FORMA', 'KINPERM', NULL, 'Formato: 80 ml
Packing: 6', 80.82, NULL, 42),
    ('540087', 'Neutralizing Lotion', NULL, NULL, 'FORMA', 'KINPERM', NULL, 'Formato: 1.000 ml
Packing: 6', 17.03, NULL, 43),
    ('540094', 'Laminating Cream', NULL, NULL, 'FORMA', 'KINSMOOTH', NULL, 'Formato: 150 ml
Packing: 6', 18.88, NULL, 44),
    ('540091', 'Hair Laminating Professional Kit', NULL, NULL, 'FORMA', 'KINSMOOTH', NULL, 'Formato: 1
Packing: 4', 195.88, NULL, 45),
    ('530037', 'Shaping Wet', NULL, NULL, 'ALTO RENDIMIENTO', 'KINWORKS', NULL, 'Formato: 400 ml
Packing: 6', 16.80, NULL, 46),
    ('520085', 'Hair Shimmer', NULL, NULL, 'ACABADO', 'HAUTE BY KINSTYLE', NULL, 'Formato: 150 ml
Packing: 6', 31.63, NULL, 47),
    ('520124', 'Essential Hairspray', NULL, NULL, 'ACABADO', 'HAUTE BY KINSTYLE', NULL, 'Formato: 300 ml
Packing: 6', 22.70, NULL, 48),
    ('520125', 'Extreme Hairspray', NULL, NULL, 'ACABADO', 'HAUTE BY KINSTYLE', NULL, 'Formato: 300 ml
Packing: 6', 22.70, NULL, 49),
    ('520127', 'Extreme Mousse', NULL, NULL, 'ACABADO', 'HAUTE BY KINSTYLE', NULL, 'Formato: 300 ml
Packing: 6', 21.46, NULL, 50),
    ('520128', 'Radical Volume', NULL, NULL, 'ACABADO', 'HAUTE BY KINSTYLE', NULL, 'Formato: 300 ml
Packing: 6', 22.62, NULL, 51),
    ('520123', 'Sea Salt Mist', NULL, NULL, 'ACABADO', 'HAUTE BY KINSTYLE', NULL, 'Formato: 200 ml
Packing: 6', 15.64, NULL, 52),
    ('520087', 'Thickening Cream', NULL, NULL, 'ACABADO', 'HAUTE BY KINSTYLE', NULL, 'Formato: 150 ml
Packing: 6', 17.73, NULL, 53),
    ('520088', 'Dry Shampoo & Volume Powder', NULL, NULL, 'ACABADO', 'HAUTE BY KINSTYLE', NULL, 'Formato: 300 ml
Packing: 6', 24.95, NULL, 54),
    ('520042', 'Thermic Spray', NULL, 'CONTROL Y PROTECCION', 'ACABADO', 'KINSTYLE', NULL, 'Formato: 200 ml
Packing: 6', 16.80, NULL, 55),
    ('520056', 'X-Trem', NULL, 'CONTROL Y PROTECCION', 'ACABADO', 'KINSTYLE', NULL, 'Formato: 200 ml
Packing: 6', 18.64, NULL, 56),
    ('520039', 'Crystal Jelly', NULL, 'FIJACION Y ESTRUCTURA', 'ACABADO', 'KINSTYLE', NULL, 'Formato: 250 ml
Packing: 6', 17.26, NULL, 57),
    ('520036', 'Essential Mousse', NULL, 'CUERPO Y VOLUMEN', 'ACABADO', 'KINSTYLE', NULL, 'Formato: 300 ml
Packing: 6', 21.46, NULL, 58),
    ('520074', 'Making Waves', NULL, 'TEXTURA', 'ACABADO', 'KINSTYLE', NULL, 'Formato: 150 ml
Packing: 6', 19.13, NULL, 59),
    ('520064', 'Potion Cream', NULL, 'TEXTURA', 'ACABADO', 'KINSTYLE', NULL, 'Formato: 150 ml
Packing: 6', 17.97, NULL, 60),
    ('520041', 'Curly Cream', NULL, 'TEXTURA', 'ACABADO', 'KINSTYLE', NULL, 'Formato: 150 ml
Packing: 6', 19.50, NULL, 61),
    ('520040', 'Mat Gum', NULL, 'TEXTURA', 'ACABADO', 'KINSTYLE', NULL, 'Formato: 100 ml
Packing: 6', 16.33, NULL, 62),
    ('520060', 'Fiber Paste', NULL, 'TEXTURA', 'ACABADO', 'KINSTYLE', NULL, 'Formato: 100 ml
Packing: 6', 13.31, NULL, 63),
    ('550075', '3-in-1', NULL, 'CUIDADO CAPILAR', 'HOMBRE', 'KINMEN', NULL, 'Formato: 300 ml
Packing: 6', 15.05, NULL, 64),
    ('550076', 'Silver Shampoo', NULL, 'CUIDADO CAPILAR', 'HOMBRE', 'KINMEN', NULL, 'Formato: 300 ml
Packing: 6', 15.05, NULL, 65),
    ('550037', 'Silver Shampoo', NULL, 'CUIDADO CAPILAR', 'HOMBRE', 'KINMEN', NULL, 'Formato: 1000 ml
Packing: 12', 37.75, NULL, 66),
    ('550077', 'Force Shampoo', NULL, 'CUIDADO CAPILAR', 'HOMBRE', 'KINMEN', NULL, 'Formato: 300 ml
Packing: 6', 15.05, NULL, 67),
    ('550040', 'Force Tonic', NULL, 'CUIDADO CAPILAR', 'HOMBRE', 'KINMEN', NULL, 'Formato: 125 ml
Packing: 6', 21.46, NULL, 68),
    ('550090', 'Beard Cream', NULL, 'CUIDADO DE LA BARBA', 'HOMBRE', 'KINMEN', NULL, 'Formato: 50 ml
Packing: 12', 10.88, NULL, 69),
    ('550078', 'Hair Matte Clay', NULL, 'ACABADO', 'HOMBRE', 'KINMEN', NULL, 'Formato: 100 ml
Packing: 6', 17.73, NULL, 70),
    ('550079', 'Hair Fiber Paste', NULL, 'ACABADO', 'HOMBRE', 'KINMEN', NULL, 'Formato: 100 ml
Packing: 6', 17.73, NULL, 71),
    ('550084', 'Hair Wet Gel', NULL, 'ACABADO', 'HOMBRE', 'KINMEN', NULL, 'Formato: 150 ml
Packing: 6', 13.78, NULL, 72),
    ('550085', 'Hair Power Gel', NULL, 'ACABADO', 'HOMBRE', 'KINMEN', NULL, 'Formato: 150 ml
Packing: 6', 19.36, NULL, 73),
    ('511047', 'Color Protecting Shampoo', NULL, 'Nº4 COLOR - Proteccion y mantenimiento del color', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 300 ml
Packing: 6', 16.22, NULL, 74),
    ('511048', 'Color Protecting Shampoo', NULL, 'Nº4 COLOR - Proteccion y mantenimiento del color', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 1.000 ml
Packing: 6', 42.41, NULL, 75),
    ('511051', 'Color Protecting 2-in-1 Mask', NULL, 'Nº4 COLOR - Proteccion y mantenimiento del color', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 200 ml
Packing: 6', 20.30, NULL, 76),
    ('511052', 'Color Protecting 2-in-1 Mask', NULL, 'Nº4 COLOR - Proteccion y mantenimiento del color', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 900 ml
Packing: 6', 51.72, NULL, 77),
    ('511055', 'Color Protecting Melting Extract', NULL, 'Nº4 COLOR - Proteccion y mantenimiento del color', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 150 ml
Packing: 6', 19.60, NULL, 78),
    ('511153', 'Pack Nº4 Color', NULL, 'Nº4 COLOR - Proteccion y mantenimiento del color', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 300 ml + 200 ml + 150 ml
Packing: 6', 56.12, NULL, 79),
    ('511049', 'Anti-Brass Blonde Shampoo', NULL, 'Nº5 BLONDE - Neutralizacion y restauracion', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 300 ml
Packing: 6', 16.22, NULL, 80),
    ('511050', 'Anti-Brass Blonde Shampoo', NULL, 'Nº5 BLONDE - Neutralizacion y restauracion', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 1.000 ml
Packing: 6', 42.41, NULL, 81),
    ('511053', 'Anti-Brass Blonde Mask', NULL, 'Nº5 BLONDE - Neutralizacion y restauracion', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 200 ml
Packing: 6', 20.30, NULL, 82),
    ('511054', 'Anti-Brass Blonde Mask', NULL, 'Nº5 BLONDE - Neutralizacion y restauracion', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 900 ml
Packing: 6', 51.72, NULL, 83),
    ('511021', 'Aftersun Shampoo & Shower Gel', NULL, 'Nº6 SUNCARE - Proteccion e hidratacion', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 300 ml
Packing: 6', 16.22, NULL, 84),
    ('511022', 'Aftersun 2-in-1 Mask', NULL, 'Nº6 SUNCARE - Proteccion e hidratacion', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 200 ml
Packing: 6', 20.30, NULL, 85),
    ('511023', 'Sun Protective Milk', NULL, 'Nº6 SUNCARE - Proteccion e hidratacion', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 200 ml
Packing: 6', 22.04, NULL, 86),
    ('511083', 'Intense Softening Shampoo', NULL, 'Nº7 CONTROL - Disciplina y definicion', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 300 ml
Packing: 6', 16.22, NULL, 87),
    ('511084', 'Intense Softening Shampoo', NULL, 'Nº7 CONTROL - Disciplina y definicion', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 1.000 ml
Packing: 6', 42.41, NULL, 88),
    ('511081', 'Curl Enhancing Shampoo', NULL, 'Nº7 CONTROL - Disciplina y definicion', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 300 ml
Packing: 6', 16.22, NULL, 89),
    ('511082', 'Curl Enhancing Shampoo', NULL, 'Nº7 CONTROL - Disciplina y definicion', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 1.000 ml
Packing: 6', 42.41, NULL, 90),
    ('511088', 'Softening 2-in-1 Mask', NULL, 'Nº7 CONTROL - Disciplina y definicion', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 200 ml
Packing: 6', 20.30, NULL, 91),
    ('511089', 'Softening 2-in-1 Mask', NULL, 'Nº7 CONTROL - Disciplina y definicion', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 900 ml
Packing: 6', 51.72, NULL, 92),
    ('511086', 'Curl Enhancing 2-in-1-Mask', NULL, 'Nº7 CONTROL - Disciplina y definicion', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 200 ml
Packing: 6', 20.30, NULL, 93),
    ('511087', 'Curl Enhancing 2-in-1-Mask', NULL, 'Nº7 CONTROL - Disciplina y definicion', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 900 ml
Packing: 6', 51.72, NULL, 94),
    ('511092', 'Intensive Anti-Frizz Shot', NULL, 'Nº7 CONTROL - Disciplina y definicion', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 100 ml
Packing: 6', 17.38, NULL, 95),
    ('511091', 'Softening Melting Extract', NULL, 'Nº7 CONTROL - Disciplina y definicion', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 150 ml
Packing: 6', 19.60, NULL, 96),
    ('511090', 'Curl Enhancing Leave-in', NULL, 'Nº7 CONTROL - Disciplina y definicion', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 150 ml
Packing: 6', 19.13, NULL, 97),
    ('511154', 'Pack Nº7 Control (Curl)', NULL, 'Nº7 CONTROL - Disciplina y definicion', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 300 ml + 200 ml + 150 ml
Packing: 6', 56.12, NULL, 98),
    ('511155', 'Pack Nº7 Control (Straight)', NULL, 'Nº7 CONTROL - Disciplina y definicion', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 300 ml + 200 ml + 150 ml
Packing: 6', 56.12, NULL, 99),
    ('511144', 'Multivitamin Scalp Serum', NULL, 'Nº8 SCALP - Equilibrio y bienestar del cuero cabelludo', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 75 ml
Packing: 6', 20.97, NULL, 100),
    ('511110', 'Anti-Hair Loss Revitalizing Shampoo', NULL, 'ANTI-HAIR LOSS - Cabellos con tendencia a la caida', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 300 ml
Packing: 6', 17.73, NULL, 101),
    ('511111', 'Anti-Hair Loss Revitalizing Shampoo', NULL, 'ANTI-HAIR LOSS - Cabellos con tendencia a la caida', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 1.000 ml
Packing: 6', 45.53, NULL, 102),
    ('511112', 'Anti-Hair Loss Complexe Trico-Active', NULL, 'ANTI-HAIR LOSS - Cabellos con tendencia a la caida', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 10 x 6 ml
Packing: 6', 53.92, NULL, 103),
    ('511113', 'Pack Nº8 Scalp (Anti-Hair Loss)', NULL, 'ANTI-HAIR LOSS - Cabellos con tendencia a la caida', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 300 ml + 10 x 6 ml
Packing: 6', 71.65, NULL, 104),
    ('511135', 'Anti-Dandruff Purifying Shampoo', NULL, 'ANTI-DANDRUFF - Cabellos con todo tipo de caspa', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 300 ml
Packing: 6', 17.73, NULL, 105),
    ('511136', 'Anti-Dandruff Purifying Shampoo', NULL, 'ANTI-DANDRUFF - Cabellos con todo tipo de caspa', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 1.000 ml
Packing: 6', 45.53, NULL, 106),
    ('511137', 'Anti-Dandruff Purifying Scrub', NULL, 'ANTI-DANDRUFF - Cabellos con todo tipo de caspa', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 200 ml
Packing: 6', 24.54, NULL, 107),
    ('511138', 'Oil Control Balancing Shampoo', NULL, 'OIL CONTROL - Para cuero cabelludo graso', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 300 ml
Packing: 6', 17.73, NULL, 108),
    ('511139', 'Oil Control Balancing Shampoo', NULL, 'OIL CONTROL - Para cuero cabelludo graso', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 1.000 ml
Packing: 6', 45.53, NULL, 109),
    ('511140', 'Oil Control Balancing Clay', NULL, 'OIL CONTROL - Para cuero cabelludo graso', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 3 x 15 ml
Packing: 6', 35.94, NULL, 110),
    ('511141', 'Daily Soothing Shampoo', NULL, 'COMFORT - Para cuero cabelludo sensible', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 300 ml
Packing: 6', 17.73, NULL, 111),
    ('511142', 'Daily Soothing Shampoo', NULL, 'COMFORT - Para cuero cabelludo sensible', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 1.000 ml
Packing: 6', 45.53, NULL, 112),
    ('511143', 'SOS Soothing Serum', NULL, 'COMFORT - Para cuero cabelludo sensible', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 30 ml
Packing: 6', 21.56, NULL, 113),
    ('513001', 'Gentle Shampoo', NULL, 'NOURISH - Cabellos normales y secos', 'CUIDADO CAPILAR', 'KINESSENCES CARE', NULL, 'Formato: 300 ml
Packing: 6', 19.47, NULL, 114),
    ('513002', 'Gentle Shampoo', NULL, 'NOURISH - Cabellos normales y secos', 'CUIDADO CAPILAR', 'KINESSENCES CARE', NULL, 'Formato: 1.000 ml
Packing: 6', 52.89, NULL, 115),
    ('513003', 'Intense Mask', NULL, 'NOURISH - Cabellos normales y secos', 'CUIDADO CAPILAR', 'KINESSENCES CARE', NULL, 'Formato: 200 ml
Packing: 6', 20.30, NULL, 116),
    ('513004', 'Intense Mask', NULL, 'NOURISH - Cabellos normales y secos', 'CUIDADO CAPILAR', 'KINESSENCES CARE', NULL, 'Formato: 900 ml
Packing: 6', 56.38, NULL, 117),
    ('513005', 'Oil', NULL, 'NOURISH - Cabellos normales y secos', 'CUIDADO CAPILAR', 'KINESSENCES CARE', NULL, 'Formato: 30 ml
Packing: 12', 11.45, NULL, 118),
    ('513006', 'Oil Cream', NULL, 'NOURISH - Cabellos normales y secos', 'CUIDADO CAPILAR', 'KINESSENCES CARE', NULL, 'Formato: 50 ml
Packing: 12', 11.45, NULL, 119),
    ('513054', 'Hand Cream', NULL, 'NOURISH - Cabellos normales y secos', 'CUIDADO CAPILAR', 'KINESSENCES CARE', NULL, 'Formato: 50 ml
Packing: 12', 7.26, NULL, 120),
    ('513007', 'Gentle Shampoo', NULL, 'ANTIOX - Cabellos coloreados', 'CUIDADO CAPILAR', 'KINESSENCES CARE', NULL, 'Formato: 300 ml
Packing: 6', 19.47, NULL, 121),
    ('513008', 'Gentle Shampoo', NULL, 'ANTIOX - Cabellos coloreados', 'CUIDADO CAPILAR', 'KINESSENCES CARE', NULL, 'Formato: 1.000 ml
Packing: 6', 52.89, NULL, 122),
    ('513009', 'Intense Mask', NULL, 'ANTIOX - Cabellos coloreados', 'CUIDADO CAPILAR', 'KINESSENCES CARE', NULL, 'Formato: 200 ml
Packing: 6', 20.30, NULL, 123),
    ('513010', 'Intense Mask', NULL, 'ANTIOX - Cabellos coloreados', 'CUIDADO CAPILAR', 'KINESSENCES CARE', NULL, 'Formato: 900 ml
Packing: 6', 56.38, NULL, 124),
    ('513011', 'Smoothie', NULL, 'ANTIOX - Cabellos coloreados', 'CUIDADO CAPILAR', 'KINESSENCES CARE', NULL, 'Formato: 50 ml
Packing: 12', 11.45, NULL, 125),
    ('513012', 'Nectar', NULL, 'ANTIOX - Cabellos coloreados', 'CUIDADO CAPILAR', 'KINESSENCES CARE', NULL, 'Formato: 150 ml
Packing: 6', 21.34, NULL, 126),
    ('513013', 'Gentle Shampoo', NULL, 'RESTORE - Cabellos dañados', 'CUIDADO CAPILAR', 'KINESSENCES CARE', NULL, 'Formato: 300 ml
Packing: 6', 19.47, NULL, 127),
    ('513014', 'Gentle Shampoo', NULL, 'RESTORE - Cabellos dañados', 'CUIDADO CAPILAR', 'KINESSENCES CARE', NULL, 'Formato: 1.000 ml
Packing: 6', 52.89, NULL, 128),
    ('513015', 'Intense Mask', NULL, 'RESTORE - Cabellos dañados', 'CUIDADO CAPILAR', 'KINESSENCES CARE', NULL, 'Formato: 200 ml
Packing: 6', 20.30, NULL, 129),
    ('513016', 'Intense Mask', NULL, 'RESTORE - Cabellos dañados', 'CUIDADO CAPILAR', 'KINESSENCES CARE', NULL, 'Formato: 900 ml
Packing: 6', 56.38, NULL, 130),
    ('513017', 'Overnight Infusion', NULL, 'RESTORE - Cabellos dañados', 'CUIDADO CAPILAR', 'KINESSENCES CARE', NULL, 'Formato: 150 ml
Packing: 6', 19.13, NULL, 131),
    ('513018', 'Repairing Booster', NULL, 'RESTORE - Cabellos dañados', 'CUIDADO CAPILAR', 'KINESSENCES CARE', NULL, 'Formato: 125 ml
Packing: 6', 22.71, NULL, 132),
    ('511001', 'Deep Care Base', NULL, 'Nº0 TECHNICAL - Uso exclusivo profesional', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 250 ml
Packing: 6', 29.61, NULL, 133),
    ('511002', 'Daily Moisturizing Shampoo', NULL, 'Nº1 NUTRITION - Hidratacion y nutricion', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 300 ml
Packing: 6', 16.22, NULL, 134),
    ('511003', 'Daily Moisturizing Shampoo', NULL, 'Nº1 NUTRITION - Hidratacion y nutricion', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 1.000 ml
Packing: 6', 42.41, NULL, 135),
    ('511004', 'Rich Nourishing Shampoo', NULL, 'Nº1 NUTRITION - Hidratacion y nutricion', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 300 ml
Packing: 6', 16.22, NULL, 136),
    ('511005', 'Rich Nourishing Shampoo', NULL, 'Nº1 NUTRITION - Hidratacion y nutricion', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 1.000 ml
Packing: 6', 42.41, NULL, 137),
    ('511006', 'Nourishing 2-in-1 Mask', NULL, 'Nº1 NUTRITION - Hidratacion y nutricion', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 200 ml
Packing: 6', 20.30, NULL, 138),
    ('511007', 'Nourishing 2-in-1 Mask', NULL, 'Nº1 NUTRITION - Hidratacion y nutricion', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 900 ml
Packing: 6', 51.72, NULL, 139),
    ('511008', 'Intensive Nourishing Shot', NULL, 'Nº1 NUTRITION - Hidratacion y nutricion', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 100 ml
Packing: 6', 17.38, NULL, 140),
    ('511009', 'Moisturizing Conditioning Spray', NULL, 'Nº1 NUTRITION - Hidratacion y nutricion', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 200 ml
Packing: 6', 18.86, NULL, 141),
    ('511010', 'Nourishing Melting Extract', NULL, 'Nº1 NUTRITION - Hidratacion y nutricion', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 150 ml
Packing: 6', 19.60, NULL, 142),
    ('511149', 'Pack Nº1 Nutrition (Moisturizing)', NULL, 'Nº1 NUTRITION - Hidratacion y nutricion', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 300 ml + 200 ml + 200 ml
Packing: 6', 55.38, NULL, 143),
    ('511150', 'Pack Nº1 Nutrition (Nourishing)', NULL, 'Nº1 NUTRITION - Hidratacion y nutricion', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 300 ml + 200 ml + 150 ml
Packing: 6', 56.12, NULL, 144),
    ('511011', 'Rich Reconstructing Shampoo', NULL, 'Nº2 REPAIR - Reparacion y fuerza', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 300 ml
Packing: 6', 16.22, NULL, 145),
    ('511012', 'Rich Reconstructing Shampoo', NULL, 'Nº2 REPAIR - Reparacion y fuerza', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 1.000 ml
Packing: 6', 42.41, NULL, 146),
    ('511013', 'Reconstructing 2-in-1 Mask', NULL, 'Nº2 REPAIR - Reparacion y fuerza', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 200 ml
Packing: 6', 20.30, NULL, 147),
    ('511014', 'Reconstructing 2-in-1 Mask', NULL, 'Nº2 REPAIR - Reparacion y fuerza', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 900 ml
Packing: 6', 51.72, NULL, 148),
    ('511015', 'Intensive Reconstructing Shot', NULL, 'Nº2 REPAIR - Reparacion y fuerza', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 100 ml
Packing: 6', 17.38, NULL, 149),
    ('511016', 'Reconstructing Melting Extract', NULL, 'Nº2 REPAIR - Reparacion y fuerza', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 150 ml
Packing: 6', 19.60, NULL, 150),
    ('511151', 'Pack Nº2 Repair', NULL, 'Nº2 REPAIR - Reparacion y fuerza', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 300 ml + 200 ml + 150 ml
Packing: 6', 56.12, NULL, 151),
    ('511017', 'Mild Expanding Shampoo', NULL, 'Nº3 VOLUME - Cuerpo y volumen', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 300 ml
Packing: 6', 16.22, NULL, 152),
    ('511018', 'Mild Expanding Shampoo', NULL, 'Nº3 VOLUME - Cuerpo y volumen', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 1.000 ml
Packing: 6', 42.41, NULL, 153),
    ('511019', 'Expanding 2-in-1 Mask', NULL, 'Nº3 VOLUME - Cuerpo y volumen', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 200 ml
Packing: 6', 20.30, NULL, 154),
    ('511020', 'Expanding Root Foam', NULL, 'Nº3 VOLUME - Cuerpo y volumen', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 150 ml
Packing: 6', 17.84, NULL, 155),
    ('511152', 'Pack Nº3 Volume', NULL, 'Nº3 VOLUME - Cuerpo y volumen', 'CUIDADO CAPILAR', 'KINACTIF', NULL, 'Formato: 300 ml + 200 ml + 150 ml
Packing: 6', 54.36, NULL, 156)
    ) AS src(
        reference,
        name,
        description,
        subcategory,
        category_name,
        product_line_name,
        image_url,
        technical_info,
        base_price,
        supplier,
        row_order
    )
    INNER JOIN all_categories category
        ON category.name = src.category_name
    INNER JOIN all_lines product_line
        ON product_line.name = src.product_line_name
       AND product_line.product_category_id = category.id
    CROSS JOIN active_status status
    ON CONFLICT (reference) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        subcategory = EXCLUDED.subcategory,
        product_category_id = EXCLUDED.product_category_id,
        product_line_id = EXCLUDED.product_line_id,
        image_url = EXCLUDED.image_url,
        technical_info = EXCLUDED.technical_info,
        status_id = EXCLUDED.status_id,
        base_price = EXCLUDED.base_price,
        supplier = EXCLUDED.supplier,
        updated_at = now()
    RETURNING id
)
SELECT
    (SELECT COUNT(*) FROM upsert_categories) AS categories_upserted,
    (SELECT COUNT(*) FROM upsert_lines) AS lines_upserted,
    (SELECT COUNT(*) FROM upsert_products) AS products_upserted;

COMMIT;

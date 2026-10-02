-- Seed Kiosks
INSERT INTO kiosks (id, owner_id, code, name, location, supports_colour, paper_sheets, paper_capacity, toner_pct, state, device_secret_hash, rate_bw_paise, rate_colour_paise, double_discount_pct, cost_bw_paise, cost_colour_paise)
VALUES 
(
    '22222222-2222-2222-2222-222222222221',
    '11111111-1111-1111-1111-111111111111',
    'VISHNU01',
    'Vishnu College Library',
    'Ground Floor, Central Library, Bhimavaram',
    TRUE,
    450,
    1000,
    88.50,
    'ok',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    200, -- ₹2.00 / page
    1000, -- ₹10.00 / page
    10.00,
    50,
    250
),
(
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'HOSTELA1',
    'Boys Hostel Block A',
    'Entrance Lobby, Hostel Block A',
    FALSE,
    280,
    500,
    45.00,
    'ok',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    200,
    0,
    5.00,
    50,
    250
),
(
    '22222222-2222-2222-2222-222222222223',
    '11111111-1111-1111-1111-111111111111',
    'DWARAKA1',
    'Dwaraka Nagar Kiosk',
    'Near Bus Stand, Dwaraka Nagar, Vizag',
    TRUE,
    0,
    1000,
    12.00,
    'no_paper',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    150,
    800,
    10.00,
    40,
    200
)
ON CONFLICT (code) DO NOTHING;

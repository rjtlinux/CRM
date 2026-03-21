-- WhatsApp Business API Integration
-- Run this on each tenant's database

-- Stores the tenant's connected WhatsApp Business number credentials
CREATE TABLE IF NOT EXISTS whatsapp_config (
    id SERIAL PRIMARY KEY,
    phone_number_id VARCHAR(50) UNIQUE NOT NULL,
    waba_id VARCHAR(50),
    display_phone VARCHAR(20),
    access_token TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    connected_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Stores per-contact conversation history (one row per WhatsApp contact)
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
    id SERIAL PRIMARY KEY,
    wa_phone VARCHAR(20) NOT NULL UNIQUE,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255),
    messages JSONB DEFAULT '[]',
    last_message_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_phone ON whatsapp_conversations(wa_phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_customer ON whatsapp_conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_last_msg ON whatsapp_conversations(last_message_at DESC);

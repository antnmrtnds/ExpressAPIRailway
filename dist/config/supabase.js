"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables.');
}
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
});
exports.supabase
    .from('users')
    .select('count')
    .limit(1)
    .then(({ error }) => {
    if (error) {
        console.error('Supabase connection failed in API Gateway:', error.message);
    }
    else {
        console.log('API Gateway: Supabase connection established');
    }
});

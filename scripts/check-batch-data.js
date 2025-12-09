require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkBatch() {
  const batchId = 'manual-1765294110788-April-02-pdf';
  
  console.log('Checking batch:', batchId);
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'NOT SET');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET');
  console.log('');
  
  const { data, error } = await supabase
    .from('queued_imports')
    .select('id, csv_data, csv_analysis, csv_file_name, csv_mapping_name, csv_mapping_template_id, csv_fingerprint, source_batch_id, import_setup_id')
    .eq('source_batch_id', batchId)
    .limit(1);
  
  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }
  
  if (!data || data.length === 0) {
    console.log('No data found for this batch');
    process.exit(1);
  }
  
  const first = data[0];
  console.log('First queued import for batch:');
  console.log('ID:', first.id);
  console.log('source_batch_id:', first.source_batch_id);
  console.log('import_setup_id:', first.import_setup_id);
  console.log('');
  console.log('CSV Fields:');
  console.log('csv_data:', first.csv_data ? `EXISTS (${Array.isArray(first.csv_data) ? first.csv_data.length + ' rows' : typeof first.csv_data})` : 'NULL');
  console.log('csv_analysis:', first.csv_analysis ? 'EXISTS' : 'NULL');
  console.log('csv_file_name:', first.csv_file_name || 'NULL');
  console.log('csv_mapping_name:', first.csv_mapping_name || 'NULL');
  console.log('csv_mapping_template_id:', first.csv_mapping_template_id || 'NULL');
  console.log('csv_fingerprint:', first.csv_fingerprint || 'NULL');
  
  // Check import setup
  if (first.import_setup_id) {
    const { data: setup, error: setupError } = await supabase
      .from('automatic_import_setups')
      .select('id, source_type, integration_name')
      .eq('id', first.import_setup_id)
      .single();
    
    if (!setupError && setup) {
      console.log('');
      console.log('Import Setup:');
      console.log('source_type:', setup.source_type);
      console.log('integration_name:', setup.integration_name);
    }
  }
}

checkBatch().catch(console.error);

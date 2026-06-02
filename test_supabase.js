const url = "https://lxbvadjjboavxwidxsnl.supabase.co";
const key = "sb_publishable_Ubv4Ofl0uR9o6ct9PvI1uA_C9hglPNT";

async function checkTable(tableName) {
    try {
        const res = await fetch(`${url}/rest/v1/${encodeURIComponent(tableName)}?select=*`, {
            headers: {
                "apikey": key,
                "Authorization": `Bearer ${key}`
            }
        });
        const data = await res.json();
        console.log(`Table '${tableName}': Status ${res.status}`, data);
    } catch (e) {
        console.error(`Error on '${tableName}':`, e);
    }
}

async function checkStorage(bucketName) {
    try {
        const res = await fetch(`${url}/storage/v1/bucket/${encodeURIComponent(bucketName)}`, {
            headers: {
                "apikey": key,
                "Authorization": `Bearer ${key}`
            }
        });
        const data = await res.json();
        console.log(`Bucket '${bucketName}': Status ${res.status}`, data);
    } catch (e) {
        console.error(`Error on bucket '${bucketName}':`, e);
    }
}

async function run() {
    console.log("Starting Supabase tests...");
    await checkTable('Categories & Programs');
    await checkTable('Mark Management');
    await checkTable('Schedule Manager');
    await checkTable('contenttext');
    await checkStorage('Design Studio');
    await checkStorage('Gallery Manager');
    await checkStorage('json file');
    await checkStorage('json_file');
}

run();

async function listAllBuckets() { try { const res = await fetch(url + '/storage/v1/bucket', { headers: { 'apikey': key, 'Authorization': 'Bearer ' + key } }); const data = await res.json(); console.log('All buckets:', data); } catch (e) { console.error('Error listing buckets:', e); } } listAllBuckets();

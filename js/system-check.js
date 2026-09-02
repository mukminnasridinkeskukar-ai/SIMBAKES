    // ============================================================
    // VERIFIKASI SISTEM FINAL - Debug logging
    // ============================================================
    console.group('🔍 SIMBAKES SYSTEM CHECK');
    
    const criticalFunctions = [
        'renderAdminTableFinal',
        'openFullScreenLightbox', 
        'openRecordDetailByIndex',
        'resolveSupabaseImage',
        'openEditMode',
        'handleEditSubmit',
        'confirmDeleteAction'
    ];
    
    let allLoaded = true;
    criticalFunctions.forEach(fn => {
        const exists = typeof window[fn] === 'function';
        console.log(`${exists ? '✅' : '❌'} ${fn}: ${exists ? 'LOADED' : 'MISSING'}`);
        if (!exists) allLoaded = false;
    });
    
    console.log('submissionsData:', Array.isArray(window.submissionsData) ? `${window.submissionsData.length} records` : 'NOT ARRAY');
    console.log('activeRecord:', window.activeRecord ? 'SET' : 'NULL');
    
    if (allLoaded) {
        console.log('✅ ALL SYSTEMS NOMINAL');
    } else {
        console.error('⚠️ SOME SYSTEMS MISSING - Check errors above');
    }
    
    console.groupEnd();

// ====== CONFIGURATION & STORAGE KEY ======
const STORAGE_KEY = "fam_gathering_premium_v5";

// ====== 1. SYSTEM INITIALIZATION ======
function initDatabase() {
    if (!localStorage.getItem(STORAGE_KEY)) {
        const defaultData = {
            settings: {
                total_bulan_program: 6,
                sisa_bulan_berjalan: 5,
                total_biaya_per_orang: 1500000,
                akses_kursi: "buka",
                token_pendaftaran: "GATH-9A3X"
            },
            users: [
                { id: "ADMIN", nama: "Super Admin", pass: "admin123", role: "admin" }
            ],
            members: [] 
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
    }
}

let currentSession = null;
let globalCalculatedTotal = 0; 

window.onload = function() {
    initDatabase();
    checkActiveSession();
};

function generateRandomToken() {
    return "GATH-" + Math.random().toString(36).substring(2, 6).toUpperCase();
}

function prepareWALink() {
    const msg = encodeURIComponent("Halo Admin, saya meminta token pendaftaran resmi Family Gathering.");
    document.getElementById('wa-link').href = "https://wa.me/628123456789?text=" + msg;
}

// ====== 2. AUTH LOGIC ======
function switchTab(target) {
    if (target === 'login') {
        document.getElementById('login-form').classList.remove('hidden');
        document.getElementById('register-form').classList.add('hidden');
        document.getElementById('tab-login-btn').classList.add('active');
        document.getElementById('tab-register-btn').classList.remove('active');
    } else {
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('register-form').classList.remove('hidden');
        document.getElementById('tab-login-btn').classList.remove('active');
        document.getElementById('tab-register-btn').classList.add('active');
    }
}

function register() {
    const id = document.getElementById('reg-id').value.trim().toUpperCase();
    const nama = document.getElementById('reg-nama').value.trim();
    const pass = document.getElementById('reg-pass').value;
    const token = document.getElementById('reg-token').value.trim();

    if (!id || !nama || !pass || !token) return alert("Mohon isi semua bidang!");
    if (id.length < 3 || isNaN(id.slice(-3))) return alert("3 digit terakhir ID wajib angka!");

    let db = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (token !== db.settings.token_pendaftaran) return alert("Token tidak valid atau kedaluwarsa!");
    if (db.users.find(u => u.id === id)) return alert("ID Karyawan sudah terdaftar!");

    db.users.push({ id, nama, pass, role: "user" });
    db.members.push({
        id_member: "MEM-" + Date.now(),
        id_karyawan: id,
        nama_peserta: nama + " (Karyawan)",
        no_kursi: "K-01",
        bulan_bergabung: db.settings.sisa_bulan_berjalan, 
        status_bayar: "Belum Lunas"
    });

    db.settings.token_pendaftaran = generateRandomToken();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    alert("Registrasi Berhasil! Silakan Masuk.");
    switchTab('login');
}

function login() {
    const id = document.getElementById('login-id').value.trim().toUpperCase();
    const pass = document.getElementById('login-pass').value;

    let db = JSON.parse(localStorage.getItem(STORAGE_KEY));
    let user = db.users.find(u => u.id === id && u.pass === pass);

    if (!user) return alert("Kombinasi ID atau Sandi Salah!");

    currentSession = user;
    sessionStorage.setItem("active_user", JSON.stringify(user));
    showCorrectDashboard();
}

function logout() {
    currentSession = null;
    sessionStorage.removeItem("active_user");
    document.getElementById('auth-page').classList.remove('hidden');
    document.getElementById('user-page').classList.add('hidden');
    document.getElementById('admin-page').classList.add('hidden');
    document.getElementById('user-info').classList.add('hidden');
}

function checkActiveSession() {
    let savedSession = sessionStorage.getItem("active_user");
    if (savedSession) {
        currentSession = JSON.parse(savedSession);
        showCorrectDashboard();
    }
}

function showCorrectDashboard() {
    document.getElementById('auth-page').classList.add('hidden');
    document.getElementById('user-info').classList.remove('hidden');
    
    document.getElementById('avatar-letter').innerText = currentSession.nama.charAt(0).toUpperCase();
    document.getElementById('session-name').innerText = currentSession.nama;
    document.getElementById('session-role').innerText = currentSession.role === 'admin' ? "SUPER ADMIN" : "KARYAWAN";

    if (currentSession.role === 'admin') {
        document.getElementById('admin-page').classList.remove('hidden');
        document.getElementById('user-page').classList.add('hidden');
        loadAdminPanel();
    } else {
        document.getElementById('user-page').classList.remove('hidden');
        document.getElementById('admin-page').classList.add('hidden');
        loadUserDashboard();
    }
}

// ====== 3. USER DASHBOARD & SMART BILLING LOGIC ======
function loadUserDashboard() {
    let db = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const settings = db.settings;
    
    const kodeUnik = parseInt(currentSession.id.slice(-3)) || 0;
    let myFamily = db.members.filter(m => m.id_karyawan === currentSession.id);

    const totalBulanProgram = settings.total_bulan_program;
    const sisaBulanSaatIni = settings.sisa_bulan_berjalan;
    const biayaPerOrang = settings.total_biaya_per_orang;
    const iuranNormalPerBulan = biayaPerOrang / totalBulanProgram;

    let akumulasiTagihanKeluarga = 0;

    myFamily.forEach(member => {
        let bulanTerlewat = totalBulanProgram - member.bulan_bergabung;
        let nilaiTerlewat = bulanTerlewat * iuranNormalPerBulan;
        let tambahanPerBulanSisa = sisaBulanSaatIni > 0 ? (nilaiTerlewat / sisaBulanSaatIni) : 0;
        akumulasiTagihanKeluarga += (iuranNormalPerBulan + tambahanPerBulanSisa) * sisaBulanSaatIni;
    });

    let tagihanDibulatkan = Math.ceil(akumulasiTagihanKeluarga / 1000) * 1000;
    globalCalculatedTotal = tagihanDibulatkan + kodeUnik;

    document.getElementById('bill-total-months').innerText = totalBulanProgram + " Bln";
    document.getElementById('bill-months').innerText = sisaBulanSaatIni + " Bln";
    document.getElementById('bill-code').innerText = String(kodeUnik).padStart(3, '0');
    document.getElementById('bill-total').innerText = "Rp " + globalCalculatedTotal.toLocaleString('id-ID');

    const formInputKursi = document.getElementById('family-input-form');
    const alertKursiDitutup = document.getElementById('seat-closed-alert');

    if (settings.akses_kursi === "tutup") {
        formInputKursi.classList.add('hidden');
        alertKursiDitutup.classList.remove('hidden');
    } else {
        formInputKursi.classList.remove('hidden');
        alertKursiDitutup.classList.add('hidden');
        renderSeatOptions(db);
    }

    let tbody = document.getElementById('family-list-table');
    tbody.innerHTML = "";
    myFamily.forEach(member => {
        let isLunas = member.status_bayar === "LUNAS";
        let statusBadge = isLunas ? '<span class="badge-lunas">Lunas</span>' : '<span class="badge-belum">Belum Lunas</span>';
        tbody.innerHTML += `
            <tr>
                <td><strong>${member.nama_peserta}</strong></td>
                <td><span style="color:#2481cc; font-weight:500;">${member.no_kursi}</span></td>
                <td style="color:#8e8e93; font-size:13px;">Ke-${totalBulanProgram - member.bulan_bergabung + 1}</td>
                <td>${statusBadge}</td>
            </tr>
        `;
    });
}

function renderSeatOptions(db) {
    const select = document.getElementById('member-seat');
    if (!select) return;
    select.innerHTML = '<option value="">Kursi</option>';
    for (let i = 1; i <= 40; i++) {
        let nomorKursi = "K-" + String(i).padStart(2, '0');
        if (!db.members.find(m => m.no_kursi === nomorKursi)) {
            select.innerHTML += `<option value="${nomorKursi}">${nomorKursi}</option>`;
        }
    }
}

function addFamilyMember() {
    let db = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (db.settings.akses_kursi === "tutup") return alert("Akses pemilihan kursi ditutup admin!");

    const namaInput = document.getElementById('member-nama');
    const seatInput = document.getElementById('member-seat');
    
    if (!namaInput.value.trim() || !seatInput.value) return alert("Mohon lengkapi nama dan kursi!");
    if (db.members.find(m => m.no_kursi === seatInput.value)) return alert("Kursi sudah terisi!");

    db.members.push({
        id_member: "MEM-" + Date.now(),
        id_karyawan: currentSession.id,
        nama_peserta: namaInput.value.trim(),
        no_kursi: seatInput.value,
        bulan_bergabung: db.settings.sisa_bulan_berjalan, 
        status_bayar: "Belum Lunas"
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    namaInput.value = ""; seatInput.value = "";
    loadUserDashboard();
}

// ====== 4. QRIS INTERACTIVE MODULE ======
function openQrisModal() {
    document.getElementById('qris-modal-amount').innerText = "Rp " + globalCalculatedTotal.toLocaleString('id-ID');
    document.getElementById('qris-modal').classList.remove('hidden');
}

function closeQrisModal() {
    document.getElementById('qris-modal').classList.add('hidden');
}

// ====== 5. SUPER ADMIN PANEL LOGIC ======
function loadAdminPanel() {
    let db = JSON.parse(localStorage.getItem(STORAGE_KEY));
    
    document.getElementById('set-total-months').value = db.settings.total_bulan_program;
    document.getElementById('set-months').value = db.settings.sisa_bulan_berjalan;
    document.getElementById('set-price').value = db.settings.total_biaya_per_orang;
    document.getElementById('set-seat-status').value = db.settings.akses_kursi;
    document.getElementById('admin-active-token').innerText = db.settings.token_pendaftaran;

    let tbody = document.getElementById('admin-payment-table');
    tbody.innerHTML = "";

    if (db.members.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#8e8e93; padding:20px;">Belum ada data pendaftar.</td></tr>`;
    }

    db.members.forEach(m => {
        let isLunas = m.status_bayar === "LUNAS";
        let statusBadge = isLunas ? '<span class="badge-lunas">Lunas</span>' : '<span class="badge-belum">Pending</span>';
        let aksiButton = isLunas 
            ? `<button class="ios-btn-secondary" style="color:var(--tg-danger)" onclick="togglePaymentStatus('${m.id_member}', false)">Batalkan</button>`
            : `<button class="ios-btn-secondary" style="color:var(--tg-success)" onclick="togglePaymentStatus('${m.id_member}', true)">Konfirmasi</button>`;
            
        tbody.innerHTML += `
            <tr>
                <td><small style="color:#8e8e93;">${m.id_karyawan}</small></td>
                <td><strong>${m.nama_peserta}</strong></td>
                <td><span style="color:var(--tg-primary)">${m.no_kursi}</span></td>
                <td>${statusBadge}</td>
                <td style="text-align: right;">${aksiButton}</td>
            </tr>
        `;
    });
}

function generateNewTokenManual() {
    let db = JSON.parse(localStorage.getItem(STORAGE_KEY));
    db.settings.token_pendaftaran = generateRandomToken();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    loadAdminPanel();
}

function copyTokenText() {
    let db = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const token = db.settings.token_pendaftaran;
    const textBalasan = "Halo, berikut token pendaftaran resmi Anda:\n\n" + token + "\n\nSilakan masukkan di menu pendaftaran aplikasi web.";
    navigator.clipboard.writeText(textBalasan).then(() => alert("Template teks balasan disalin!"));
}

function saveAdminSettings() {
    const tm = parseInt(document.getElementById('set-total-months').value);
    const m = parseInt(document.getElementById('set-months').value);
    const p = parseInt(document.getElementById('set-price').value);
    const s = document.getElementById('set-seat-status').value;

    if (m > tm) return alert("Sisa bulan tidak boleh melebihi total program!");

    let db = JSON.parse(localStorage.getItem(STORAGE_KEY));
    db.settings.total_bulan_program = tm;
    db.settings.sisa_bulan_berjalan = m;
    db.settings.total_biaya_per_orang = p;
    db.settings.akses_kursi = s;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    alert("Pengaturan Super Admin Disimpan!");
    loadAdminPanel();
}

function togglePaymentStatus(idMember, setLunas) {
    let db = JSON.parse(localStorage.getItem(STORAGE_KEY));
    let target = db.members.find(m => m.id_member === idMember);
    if (target) {
        target.status_bayar = setLunas ? "LUNAS" : "Belum Lunas";
        localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
        loadAdminPanel();
    }
}

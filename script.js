// app.js - RPG Fichas
let currentUser = null;
let fichasCache = [];
let ultimoDoc = null;
let carregandoMais = false;
let todosCarregados = false;
const FICHAS_POR_PAGINA = 10;
let fichaParaExcluir = null;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

document.addEventListener('DOMContentLoaded', () => {
    setupAuth();
    setupListeners();
    carregarFichas();
});

// ========== AUTH ==========
function setupAuth() {
    auth.onAuthStateChanged(user => {
        currentUser = user;
        atualizarUI(user);
    });
}

function atualizarUI(user) {
    const loginText = $('#loginText');
    const btnLogin = $('#btnLogin');
    const btnLogout = $('#btnLogout');
    const btnNovaFicha = $('#btnNovaFicha');

    if (user) {
        loginText.textContent = user.displayName || user.email.split('@')[0];
        btnLogin.style.display = 'none';
        btnLogout.style.display = 'inline-flex';
        btnNovaFicha.style.display = 'inline-flex';
    } else {
        loginText.textContent = 'Entrar';
        btnLogin.style.display = 'inline-flex';
        btnLogout.style.display = 'none';
        btnNovaFicha.style.display = 'none';
    }
    atualizarVisibilidadeBotoes();
}

function atualizarVisibilidadeBotoes() {
    $$('.ficha-card-actions').forEach(div => {
        div.style.display = currentUser ? 'flex' : 'none';
    });
}

// ========== EVENTOS ==========
function setupListeners() {
    $('#menuToggle')?.addEventListener('click', () => {
        $('.nav-links').classList.toggle('open');
    });

    $('#btnLogin')?.addEventListener('click', () => abrirModal('modalLogin'));
    $('#btnLogout')?.addEventListener('click', logout);
    $('#btnNovaFicha')?.addEventListener('click', () => {
        if (!currentUser) {
            abrirModal('modalLogin');
            showToast('Faça login para criar fichas!', 'warning');
            return;
        }
        abrirModalFicha(null);
    });

    // Fechar modais
    $$('.modal-close, [data-close]').forEach(el => {
        el.addEventListener('click', () => {
            const id = el.dataset.close || el.closest('.modal-overlay')?.id;
            if (id) fecharModal(id);
        });
    });
    $$('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', e => {
            if (e.target === overlay) fecharModal(overlay.id);
        });
    });

    // Login/Registro toggle
    let isRegister = false;
    $('#toggleAuthLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        isRegister = !isRegister;
        $('#modalLoginTitle').textContent = isRegister ? 'Cadastrar' : 'Entrar';
        $('#modalLoginSub').textContent = isRegister ? 'Crie sua conta' : 'Acesse sua conta';
        $('#btnLoginSubmit').textContent = isRegister ? 'Cadastrar' : 'Entrar';
        $('#toggleAuthText').textContent = isRegister ? 'Já tem conta?' : 'Não tem conta?';
        $('#toggleAuthLink').textContent = isRegister ? 'Entrar' : 'Cadastre-se';
        $('#loginNomeGroup').style.display = isRegister ? 'block' : 'none';
        $('#authError').style.display = 'none';
    });

    $('#btnLoginSubmit')?.addEventListener('click', handleLogin);
    $('#formFicha')?.addEventListener('submit', salvarFicha);
    $('#btnFiltrar')?.addEventListener('click', aplicarFiltros);
    $('#btnLimparFiltros')?.addEventListener('click', limparFiltros);
    $('#searchInput')?.addEventListener('keyup', e => { if (e.key === 'Enter') aplicarFiltros(); });
    $('#btnLoadMore')?.addEventListener('click', carregarMais);
    $('#btnConfirmarExclusao')?.addEventListener('click', confirmarExclusao);

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') $$('.modal-overlay.active').forEach(m => fecharModal(m.id));
    });
}

// ========== MODAIS ==========
function abrirModal(id) { document.getElementById(id)?.classList.add('active'); }
function fecharModal(id) { document.getElementById(id)?.classList.remove('active'); }

// ========== AUTH FUNCTIONS ==========
async function handleLogin() {
    const email = $('#loginEmail')?.value.trim();
    const senha = $('#loginSenha')?.value;
    const nome = $('#loginNome')?.value.trim();
    const errorDiv = $('#authError');
    const isRegister = $('#btnLoginSubmit').textContent === 'Cadastrar';

    if (!email || !senha) {
        errorDiv.textContent = 'Preencha e-mail e senha.';
        errorDiv.style.display = 'block';
        return;
    }
    try {
        if (isRegister) {
            if (!nome) { errorDiv.textContent = 'Nome é obrigatório.'; errorDiv.style.display = 'block'; return; }
            const cred = await auth.createUserWithEmailAndPassword(email, senha);
            await cred.user.updateProfile({ displayName: nome });
            showToast('Conta criada!', 'success');
        } else {
            await auth.signInWithEmailAndPassword(email, senha);
            showToast('Login feito!', 'success');
        }
        fecharModal('modalLogin');
        $('#loginEmail').value = ''; $('#loginSenha').value = ''; $('#loginNome').value = '';
    } catch (err) {
        let msg = 'Erro.';
        if (err.code === 'auth/email-already-in-use') msg = 'E-mail já cadastrado.';
        else if (err.code === 'auth/weak-password') msg = 'Senha fraca (mínimo 6).';
        errorDiv.textContent = msg;
        errorDiv.style.display = 'block';
    }
}

async function logout() {
    await auth.signOut();
    showToast('Saiu da conta.', 'success');
    carregarFichas();
}

// ========== CRUD FICHAS ==========
function abrirModalFicha(ficha) {
    $('#formError').style.display = 'none';
    $('#formFicha').reset();
    $('#fichaId').value = '';

    if (ficha) {
        $('#modalFichaTitle').textContent = 'Editar Ficha';
        $('#fichaId').value = ficha.id;
        $('#fichaNome').value = ficha.nome || '';
        $('#fichaRaca').value = ficha.raca || '';
        $('#fichaClasse').value = ficha.classe || '';
        $('#fichaNivel').value = ficha.nivel || 1;
        $('#fichaForca').value = ficha.forca || 10;
        $('#fichaDestreza').value = ficha.destreza || 10;
        $('#fichaConstituicao').value = ficha.constituicao || 10;
        $('#fichaInteligencia').value = ficha.inteligencia || 10;
        $('#fichaSabedoria').value = ficha.sabedoria || 10;
        $('#fichaCarisma').value = ficha.carisma || 10;
        $('#fichaHP').value = ficha.hp || 10;
        $('#fichaImagem').value = ficha.imagem || '';
        $('#fichaEquipamentos').value = ficha.equipamentos || '';
        $('#fichaDescricao').value = ficha.descricao || '';
    } else {
        $('#modalFichaTitle').textContent = 'Nova Ficha';
    }
    abrirModal('modalFicha');
}

async function salvarFicha(e) {
    e.preventDefault();
    const errorDiv = $('#formError');
    errorDiv.style.display = 'none';

    if (!currentUser) {
        showToast('Logue para salvar!', 'warning');
        return;
    }

    const id = $('#fichaId').value;
    const dados = {
        nome: $('#fichaNome').value.trim(),
        raca: $('#fichaRaca').value,
        classe: $('#fichaClasse').value,
        nivel: parseInt($('#fichaNivel').value) || 1,
        forca: parseInt($('#fichaForca').value) || 10,
        destreza: parseInt($('#fichaDestreza').value) || 10,
        constituicao: parseInt($('#fichaConstituicao').value) || 10,
        inteligencia: parseInt($('#fichaInteligencia').value) || 10,
        sabedoria: parseInt($('#fichaSabedoria').value) || 10,
        carisma: parseInt($('#fichaCarisma').value) || 10,
        hp: parseInt($('#fichaHP').value) || 10,
        imagem: $('#fichaImagem').value.trim(),
        equipamentos: $('#fichaEquipamentos').value.trim(),
        descricao: $('#fichaDescricao').value.trim(),
        userId: currentUser.uid,
    };

    if (!dados.nome || !dados.raca || !dados.classe) {
        errorDiv.textContent = 'Nome, raça e classe são obrigatórios.';
        errorDiv.style.display = 'block';
        return;
    }

    try {
        if (id) {
            await db.collection('fichas').doc(id).update({
                ...dados,
                atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
            });
            showToast('Ficha atualizada!', 'success');
        } else {
            await db.collection('fichas').add({
                ...dados,
                criadoEm: firebase.firestore.FieldValue.serverTimestamp()
            });
            showToast('Ficha criada!', 'success');
        }
        fecharModal('modalFicha');
        resetarCache();
        carregarFichas();
    } catch (err) {
        errorDiv.textContent = 'Erro ao salvar. Tente novamente.';
        errorDiv.style.display = 'block';
    }
}

function abrirConfirmacao(ficha) {
    fichaParaExcluir = ficha;
    $('#confirmText').textContent = `Deseja mesmo excluir "${ficha.nome}"?`;
    abrirModal('modalConfirmacao');
}

async function confirmarExclusao() {
    if (!fichaParaExcluir) return;
    await db.collection('fichas').doc(fichaParaExcluir.id).delete();
    showToast('Ficha excluída!', 'success');
    fecharModal('modalConfirmacao');
    fichasCache = fichasCache.filter(f => f.id !== fichaParaExcluir.id);
    fichaParaExcluir = null;
    renderizarFichas(fichasCache);
}

// ========== CARREGAR / RENDERIZAR ==========
async function carregarFichas() {
    mostrarLoading(true);
    $('#emptyState').style.display = 'none';
    fichasCache = [];
    ultimoDoc = null;
    todosCarregados = false;

    if (!currentUser) {
        mostrarLoading(false);
        $('#emptyState').style.display = 'block';
        $('#fichaGrid').innerHTML = '';
        return;
    }

    try {
        const q = db.collection('fichas')
            .where('userId', '==', currentUser.uid)
            .orderBy('criadoEm', 'desc')
            .limit(FICHAS_POR_PAGINA);
        const snap = await q.get();

        if (snap.empty) {
            $('#emptyState').style.display = 'block';
        } else {
            fichasCache = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            ultimoDoc = snap.docs[snap.docs.length - 1];
            todosCarregados = snap.docs.length < FICHAS_POR_PAGINA;
        }
        aplicarFiltrosLocais();
    } catch (err) {
        console.error(err);
    } finally {
        mostrarLoading(false);
        atualizarBotaoMais();
    }
}

async function carregarMais() {
    if (carregandoMais || todosCarregados || !ultimoDoc) return;
    carregandoMais = true;
    const btn = $('#btnLoadMore');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px;"></div>';

    const q = db.collection('fichas')
        .where('userId', '==', currentUser.uid)
        .orderBy('criadoEm', 'desc')
        .startAfter(ultimoDoc)
        .limit(FICHAS_POR_PAGINA);
    const snap = await q.get();
    if (snap.empty) {
        todosCarregados = true;
    } else {
        const novos = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        fichasCache = [...fichasCache, ...novos];
        ultimoDoc = snap.docs[snap.docs.length - 1];
        todosCarregados = snap.docs.length < FICHAS_POR_PAGINA;
    }
    aplicarFiltrosLocais();
    carregandoMais = false;
    btn.innerHTML = '<i class="fas fa-chevron-down"></i> Carregar mais';
    btn.disabled = false;
    atualizarBotaoMais();
}

function atualizarBotaoMais() {
    $('#loadMoreContainer').style.display = todosCarregados ? 'none' : 'block';
}

function aplicarFiltrosLocais() {
    const termo = ($('#searchInput')?.value || '').toLowerCase();
    const classeFiltro = $('#filterClasse')?.value || '';
    const racaFiltro = $('#filterRaca')?.value || '';

    let filtradas = [...fichasCache];
    if (termo) {
        filtradas = filtradas.filter(f =>
            f.nome?.toLowerCase().includes(termo) ||
            f.classe?.toLowerCase().includes(termo) ||
            f.raca?.toLowerCase().includes(termo)
        );
    }
    if (classeFiltro) filtradas = filtradas.filter(f => f.classe === classeFiltro);
    if (racaFiltro) filtradas = filtradas.filter(f => f.raca === racaFiltro);

    renderizarFichas(filtradas);
}

function aplicarFiltros() { aplicarFiltrosLocais(); }
function limparFiltros() {
    $('#searchInput').value = '';
    $('#filterClasse').value = '';
    $('#filterRaca').value = '';
    aplicarFiltrosLocais();
    carregarFichas();
}

function resetarCache() {
    fichasCache = [];
    ultimoDoc = null;
    todosCarregados = false;
}

function renderizarFichas(fichas) {
    const grid = $('#fichaGrid');
    const empty = $('#emptyState');
    if (!fichas.length) {
        grid.innerHTML = '';
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';
    grid.innerHTML = fichas.map(f => {
        const img = f.imagem
            ? `<img src="${escapeHtml(f.imagem)}" alt="${escapeHtml(f.nome)}" onerror="this.parentElement.innerHTML='<div class=\\'no-image\\'><i class=\\'fas fa-user-shield\\'></i></div>'">`
            : `<div class="no-image"><i class="fas fa-user-shield"></i></div>`;
        const acoes = currentUser ? `
            <button class="btn btn-outline btn-detalhes" data-id="${f.id}"><i class="fas fa-eye"></i></button>
            <button class="btn btn-outline btn-editar" data-id="${f.id}"><i class="fas fa-edit"></i></button>
            <button class="btn btn-danger btn-excluir" data-id="${f.id}"><i class="fas fa-trash"></i></button>
        ` : '';
        return `
        <div class="ficha-card" data-id="${f.id}">
            <div class="ficha-card-img">${img}</div>
            <div class="ficha-card-body">
                <h3 class="ficha-card-title">${escapeHtml(f.nome)}</h3>
                <p class="ficha-card-subtitle">${f.raca} • ${f.classe} • Nível ${f.nivel}</p>
                <div class="ficha-card-stats">
                    <span><i class="fas fa-heart"></i> HP ${f.hp}</span>
                    <span><i class="fas fa-fist-raised"></i> FOR ${f.forca}</span>
                    <span><i class="fas fa-feather"></i> DES ${f.destreza}</span>
                </div>
                <div class="ficha-card-actions">${acoes}</div>
            </div>
        </div>`;
    }).join('');

    // Eventos dos botões
    grid.querySelectorAll('.btn-detalhes').forEach(btn => {
        btn.addEventListener('click', () => abrirDetalhes(btn.dataset.id));
    });
    grid.querySelectorAll('.btn-editar').forEach(btn => {
        btn.addEventListener('click', () => {
            const ficha = fichasCache.find(f => f.id === btn.dataset.id);
            if (ficha) abrirModalFicha(ficha);
        });
    });
    grid.querySelectorAll('.btn-excluir').forEach(btn => {
        btn.addEventListener('click', () => {
            const ficha = fichasCache.find(f => f.id === btn.dataset.id);
            if (ficha) abrirConfirmacao(ficha);
        });
    });
}

function abrirDetalhes(id) {
    const ficha = fichasCache.find(f => f.id === id);
    if (!ficha) return;

    const content = $('#detalhesContent');
    const img = ficha.imagem
        ? `<img src="${escapeHtml(ficha.imagem)}" alt="${escapeHtml(ficha.nome)}" class="detalhes-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><div class="detalhes-img no-image-placeholder" style="display:none;"><i class="fas fa-user-shield"></i></div>`
        : `<div class="detalhes-img no-image-placeholder"><i class="fas fa-user-shield"></i></div>`;

    content.innerHTML = `
    <div class="detalhes-ficha">
        ${img}
        <h2 style="font-family:var(--font-medieval); color:var(--primary);">${escapeHtml(ficha.nome)}</h2>
        <p style="color:var(--gray-600);">${ficha.raca} • ${ficha.classe} • Nível ${ficha.nivel}</p>
        <div class="detalhes-atributos" style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; margin:1rem 0;">
            <div>Força: ${ficha.forca}</div><div>Destreza: ${ficha.destreza}</div>
            <div>Constituição: ${ficha.constituicao}</div><div>Inteligência: ${ficha.inteligencia}</div>
            <div>Sabedoria: ${ficha.sabedoria}</div><div>Carisma: ${ficha.carisma}</div>
        </div>
        <p><strong>HP:</strong> ${ficha.hp}</p>
        <p><strong>Equipamentos:</strong> ${ficha.equipamentos || 'Nenhum'}</p>
        <p><strong>Descrição:</strong> ${ficha.descricao || 'Nenhuma'}</p>
    </div>`;
    abrirModal('modalDetalhes');
}

// Utilitários
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
function mostrarLoading(v) { $('#loading').style.display = v ? 'block' : 'none'; }
function showToast(msg, tipo) {
    const c = $('#toastContainer');
    const t = document.createElement('div');
    t.className = `toast ${tipo}`;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), 4000);
}
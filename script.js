// app.js
// ==================== APLICATIVO AUTOUSADOS ====================

// ---------- ESTADO GLOBAL ----------
let currentUser = null;
let carrosCache = [];
let ultimoDocumento = null;
let carregandoMais = false;
let todosCarregados = false;
const CARROS_POR_PAGINA = 12;
let carroParaExcluir = null;

// ---------- ELEMENTOS DOM ----------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ---------- INICIALIZAÇÃO ----------
document.addEventListener('DOMContentLoaded', () => {
    setupAuthListener();
    setupEventListeners();
    carregarCarros();
    carregarMarcasParaFiltro();
});

// ==================== AUTENTICAÇÃO ====================
function setupAuthListener() {
    auth.onAuthStateChanged((user) => {
        currentUser = user;
        atualizarUIUsuario(user);
        if (user) {
            console.log('👤 Usuário logado:', user.email);
        } else {
            console.log('👤 Nenhum usuário logado');
        }
    });
}

function atualizarUIUsuario(user) {
    const loginText = $('#loginText');
    const btnLogin = $('#btnLogin');
    const btnLogout = $('#btnLogout');
    const btnAnunciar = $('#btnAnunciar');

    if (user) {
        if (loginText) loginText.textContent = user.displayName || user.email?.split('@')[0] || 'Conta';
        if (btnLogin) btnLogin.style.display = 'none';
        if (btnLogout) btnLogout.style.display = 'inline-flex';
        if (btnAnunciar) btnAnunciar.style.display = 'inline-flex';
    } else {
        if (loginText) loginText.textContent = 'Entrar';
        if (btnLogin) btnLogin.style.display = 'inline-flex';
        if (btnLogout) btnLogout.style.display = 'none';
        if (btnAnunciar) btnAnunciar.style.display = 'none';
    }
    // Atualiza visibilidade dos botões de ação nos cards
    renderizarAcoesCards();
}

function renderizarAcoesCards() {
    const botoesAcao = $$('.car-card-actions');
    botoesAcao.forEach((div) => {
        if (currentUser) {
            div.style.display = 'flex';
        } else {
            div.style.display = 'none';
        }
    });
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Menu mobile
    $('#menuToggle')?.addEventListener('click', () => {
        $('.nav-links').classList.toggle('open');
    });

    // Links de navegação
    $$('.nav-link').forEach((link) => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            $$('.nav-link').forEach((l) => l.classList.remove('active'));
            link.classList.add('active');
            const tela = link.dataset.tela;
            if (tela === 'destaques') {
                carregarCarros(true);
            } else {
                carregarCarros(false);
            }
            $('.nav-links').classList.remove('open');
        });
    });

    // Logo volta para home
    $('#logoHome')?.addEventListener('click', (e) => {
        e.preventDefault();
        $$('.nav-link').forEach((l) => l.classList.remove('active'));
        const todosLink = document.querySelector('.nav-link[data-tela="todos"]');
        if (todosLink) todosLink.classList.add('active');
        carregarCarros(false);
        limparFiltros();
    });

    // Botão Login
    $('#btnLogin')?.addEventListener('click', () => abrirModal('modalLogin'));
    $('#btnLogout')?.addEventListener('click', logout);

    // Botão Anunciar
    $('#btnAnunciar')?.addEventListener('click', () => {
        if (!currentUser) {
            abrirModal('modalLogin');
            showToast('Faça login para anunciar!', 'warning');
            return;
        }
        abrirModalCarro(null);
    });

    // Fechar modais
    $$('.modal-close, [data-close]').forEach((el) => {
        el.addEventListener('click', () => {
            const modalId = el.dataset.close || el.closest('.modal-overlay')?.id;
            if (modalId) fecharModal(modalId);
        });
    });

    // Fechar modal ao clicar fora
    $$('.modal-overlay').forEach((overlay) => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) fecharModal(overlay.id);
        });
    });

    // Toggle login/registro
    $('#toggleAuthLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        toggleAuthMode();
    });

    // Submit login
    $('#btnLoginSubmit')?.addEventListener('click', handleLoginSubmit);

    // Submit formulário carro
    $('#formCarro')?.addEventListener('submit', handleSalvarCarro);

    // Busca
    $('#searchInput')?.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') aplicarFiltros();
    });
    $('#btnFiltrar')?.addEventListener('click', aplicarFiltros);
    $('#btnLimparFiltros')?.addEventListener('click', limparFiltros);

    // Carregar mais
    $('#btnLoadMore')?.addEventListener('click', carregarMaisCarros);

    // Confirmar exclusão
    $('#btnConfirmarExclusao')?.addEventListener('click', confirmarExclusao);

    // Tecla ESC fecha modais
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            $$('.modal-overlay.active').forEach((m) => fecharModal(m.id));
        }
    });
}

// ==================== MODAIS ====================
function abrirModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
}

function fecharModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

let isRegisterMode = false;

function toggleAuthMode() {
    isRegisterMode = !isRegisterMode;
    const title = $('#modalLoginTitle');
    const sub = $('#modalLoginSub');
    const btn = $('#btnLoginSubmit');
    const toggleText = $('#toggleAuthText');
    const toggleLink = $('#toggleAuthLink');
    const nomeGroup = $('#loginNomeGroup');

    if (isRegisterMode) {
        if (title) title.textContent = 'Cadastrar';
        if (sub) sub.textContent = 'Crie sua conta para anunciar';
        if (btn) btn.textContent = 'Cadastrar';
        if (toggleText) toggleText.textContent = 'Já tem conta?';
        if (toggleLink) toggleLink.textContent = 'Entrar';
        if (nomeGroup) nomeGroup.style.display = 'block';
    } else {
        if (title) title.textContent = 'Entrar';
        if (sub) sub.textContent = 'Acesse sua conta para anunciar';
        if (btn) btn.textContent = 'Entrar';
        if (toggleText) toggleText.textContent = 'Não tem conta?';
        if (toggleLink) toggleLink.textContent = 'Cadastre-se';
        if (nomeGroup) nomeGroup.style.display = 'none';
    }
    $('#authError').style.display = 'none';
}

async function handleLoginSubmit() {
    const email = $('#loginEmail')?.value.trim();
    const senha = $('#loginSenha')?.value;
    const nome = $('#loginNome')?.value.trim();
    const errorDiv = $('#authError');

    if (!email || !senha) {
        if (errorDiv) {
            errorDiv.textContent = 'Preencha e-mail e senha.';
            errorDiv.style.display = 'block';
        }
        return;
    }

    if (isRegisterMode && !nome) {
        if (errorDiv) {
            errorDiv.textContent = 'Preencha seu nome.';
            errorDiv.style.display = 'block';
        }
        return;
    }

    try {
        if (isRegisterMode) {
            const cred = await auth.createUserWithEmailAndPassword(email, senha);
            await cred.user.updateProfile({ displayName: nome });
            showToast('Conta criada com sucesso!', 'success');
        } else {
            await auth.signInWithEmailAndPassword(email, senha);
            showToast('Login realizado!', 'success');
        }
        fecharModal('modalLogin');
        isRegisterMode = false;
        toggleAuthMode();
        $('#loginEmail').value = '';
        $('#loginSenha').value = '';
        $('#loginNome').value = '';
    } catch (error) {
        console.error('Erro auth:', error);
        let msg = 'Erro ao autenticar.';
        if (error.code === 'auth/user-not-found') msg = 'Usuário não encontrado.';
        if (error.code === 'auth/wrong-password') msg = 'Senha incorreta.';
        if (error.code === 'auth/email-already-in-use') msg = 'Este e-mail já está cadastrado.';
        if (error.code === 'auth/weak-password') msg = 'A senha deve ter pelo menos 6 caracteres.';
        if (error.code === 'auth/invalid-email') msg = 'E-mail inválido.';
        if (errorDiv) {
            errorDiv.textContent = msg;
            errorDiv.style.display = 'block';
        }
    }
}

async function logout() {
    try {
        await auth.signOut();
        showToast('Você saiu da conta.', 'success');
        carregarCarros();
    } catch (error) {
        showToast('Erro ao sair.', 'error');
    }
}

// ==================== CRUD CARROS ====================
function abrirModalCarro(carro) {
    $('#formError').style.display = 'none';
    $('#formCarro').reset();
    $('#carroId').value = '';

    if (carro) {
        $('#modalCarroTitle').textContent = 'Editar Anúncio';
        $('#carroId').value = carro.id;
        $('#carroMarca').value = carro.marca || '';
        $('#carroModelo').value = carro.modelo || '';
        $('#carroAno').value = carro.ano || '';
        $('#carroPreco').value = carro.preco || '';
        $('#carroKm').value = carro.quilometragem || '';
        $('#carroCombustivel').value = carro.combustivel || '';
        $('#carroCambio').value = carro.cambio || '';
        $('#carroCor').value = carro.cor || '';
        $('#carroImagem').value = carro.imagem || '';
        $('#carroDescricao').value = carro.descricao || '';
        $('#carroDestaque').checked = carro.destaque || false;
        $('#carroVendido').checked = carro.vendido || false;
    } else {
        $('#modalCarroTitle').textContent = 'Anunciar Carro';
        $('#carroDestaque').checked = false;
        $('#carroVendido').checked = false;
    }
    abrirModal('modalCarro');
}

async function handleSalvarCarro(e) {
    e.preventDefault();
    const errorDiv = $('#formError');
    errorDiv.style.display = 'none';

    if (!currentUser) {
        showToast('Você precisa estar logado!', 'warning');
        abrirModal('modalLogin');
        return;
    }

    const id = $('#carroId').value;
    const carroData = {
        marca: $('#carroMarca').value.trim(),
        modelo: $('#carroModelo').value.trim(),
        ano: parseInt($('#carroAno').value) || 0,
        preco: parseFloat($('#carroPreco').value) || 0,
        quilometragem: parseInt($('#carroKm').value) || 0,
        combustivel: $('#carroCombustivel').value,
        cambio: $('#carroCambio').value,
        cor: $('#carroCor').value,
        imagem: $('#carroImagem').value.trim(),
        descricao: $('#carroDescricao').value.trim(),
        destaque: $('#carroDestaque').checked,
        vendido: $('#carroVendido').checked,
        userId: currentUser.uid,
    };

    // Validação
    if (!carroData.marca || !carroData.modelo || !carroData.ano || !carroData.preco ||
        !carroData.quilometragem || !carroData.combustivel || !carroData.cambio) {
        errorDiv.textContent = 'Preencha todos os campos obrigatórios (*).';
        errorDiv.style.display = 'block';
        return;
    }

    if (carroData.ano < 1990 || carroData.ano > 2026) {
        errorDiv.textContent = 'Ano inválido. Informe um ano entre 1990 e 2026.';
        errorDiv.style.display = 'block';
        return;
    }

    if (carroData.preco <= 0) {
        errorDiv.textContent = 'Informe um preço válido.';
        errorDiv.style.display = 'block';
        return;
    }

    try {
        if (id) {
            // Atualizar
            await db.collection('carros').doc(id).update({
                ...carroData,
                dataAtualizacao: firebase.firestore.FieldValue.serverTimestamp(),
            });
            showToast('Anúncio atualizado com sucesso!', 'success');
        } else {
            // Criar
            await db.collection('carros').add({
                ...carroData,
                dataCadastro: firebase.firestore.FieldValue.serverTimestamp(),
            });
            showToast('Carro anunciado com sucesso!', 'success');
        }
        fecharModal('modalCarro');
        carrosCache = [];
        ultimoDocumento = null;
        todosCarregados = false;
        carregarCarros();
    } catch (error) {
        console.error('Erro ao salvar:', error);
        errorDiv.textContent = 'Erro ao salvar. Verifique sua conexão e tente novamente.';
        errorDiv.style.display = 'block';
    }
}

function abrirConfirmacaoExclusao(carro) {
    carroParaExcluir = carro;
    $('#confirmText').textContent =
        `"${carro.marca} ${carro.modelo} - ${carro.ano}" será excluído permanentemente.`;
    abrirModal('modalConfirmacao');
}

async function confirmarExclusao() {
    if (!carroParaExcluir) return;
    try {
        await db.collection('carros').doc(carroParaExcluir.id).delete();
        showToast('Anúncio excluído!', 'success');
        fecharModal('modalConfirmacao');
        carroParaExcluir = null;
        carrosCache = carrosCache.filter((c) => c.id !== carroParaExcluir?.id);
        renderizarCarros(carrosCache);
    } catch (error) {
        console.error('Erro ao excluir:', error);
        showToast('Erro ao excluir anúncio.', 'error');
    }
}

// ==================== CARREGAR E RENDERIZAR ====================
async function carregarCarros(apenasDestaques = false) {
    mostrarLoading(true);
    $('#emptyState').style.display = 'none';
    $('#loadMoreContainer').style.display = 'none';
    carrosCache = [];
    ultimoDocumento = null;
    todosCarregados = false;

    try {
        let query = db.collection('carros').orderBy('destaque', 'desc').orderBy('dataCadastro', 'desc');

        if (apenasDestaques) {
            query = query.where('destaque', '==', true);
        }

        query = query.limit(CARROS_POR_PAGINA);

        const snapshot = await query.get();

        if (snapshot.empty) {
            mostrarLoading(false);
            $('#emptyState').style.display = 'block';
            $('#carGrid').innerHTML = '';
            return;
        }

        carrosCache = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        ultimoDocumento = snapshot.docs[snapshot.docs.length - 1];
        todosCarregados = snapshot.docs.length < CARROS_POR_PAGINA;

        aplicarFiltrosLocais();
        mostrarLoading(false);
        atualizarBotaoCarregarMais();
    } catch (error) {
        console.error('Erro ao carregar:', error);
        mostrarLoading(false);
        showToast('Erro ao carregar carros. Verifique a conexão.', 'error');
    }
}

async function carregarMaisCarros() {
    if (carregandoMais || todosCarregados || !ultimoDocumento) return;
    carregandoMais = true;
    $('#btnLoadMore').disabled = true;
    $('#btnLoadMore').innerHTML = '<span class="spinner" style="width:18px;height:18px;border-width:3px;"></span> Carregando...';

    try {
        let query = db.collection('carros')
            .orderBy('destaque', 'desc')
            .orderBy('dataCadastro', 'desc')
            .startAfter(ultimoDocumento)
            .limit(CARROS_POR_PAGINA);

        const snapshot = await query.get();

        if (snapshot.empty) {
            todosCarregados = true;
        } else {
            const novos = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            carrosCache = [...carrosCache, ...novos];
            ultimoDocumento = snapshot.docs[snapshot.docs.length - 1];
            todosCarregados = snapshot.docs.length < CARROS_POR_PAGINA;
        }

        aplicarFiltrosLocais();
        atualizarBotaoCarregarMais();
    } catch (error) {
        console.error('Erro ao carregar mais:', error);
    } finally {
        carregandoMais = false;
        $('#btnLoadMore').disabled = false;
        $('#btnLoadMore').innerHTML = '<i class="fas fa-chevron-down"></i> Carregar mais';
    }
}

function atualizarBotaoCarregarMais() {
    if (todosCarregados) {
        $('#loadMoreContainer').style.display = 'none';
    } else {
        $('#loadMoreContainer').style.display = 'block';
    }
}

function aplicarFiltrosLocais() {
    const termo = ($('#searchInput')?.value || '').toLowerCase().trim();
    const marcaFiltro = ($('#filterMarca')?.value || '').toLowerCase();
    const combustivelFiltro = $('#filterCombustivel')?.value || '';
    const cambioFiltro = $('#filterCambio')?.value || '';
    const anoMin = parseInt($('#filterAnoMin')?.value) || 0;
    const precoMax = parseFloat($('#filterPrecoMax')?.value) || 0;

    let filtrados = [...carrosCache];

    if (termo) {
        filtrados = filtrados.filter(
            (c) =>
            c.marca?.toLowerCase().includes(termo) ||
            c.modelo?.toLowerCase().includes(termo) ||
            c.descricao?.toLowerCase().includes(termo)
        );
    }

    if (marcaFiltro) {
        filtrados = filtrados.filter((c) => c.marca?.toLowerCase() === marcaFiltro);
    }

    if (combustivelFiltro) {
        filtrados = filtrados.filter((c) => c.combustivel === combustivelFiltro);
    }

    if (cambioFiltro) {
        filtrados = filtrados.filter((c) => c.cambio === cambioFiltro);
    }

    if (anoMin > 0) {
        filtrados = filtrados.filter((c) => c.ano >= anoMin);
    }

    if (precoMax > 0) {
        filtrados = filtrados.filter((c) => c.preco <= precoMax);
    }

    renderizarCarros(filtrados);
}

function aplicarFiltros() {
    aplicarFiltrosLocais();
}

function limparFiltros() {
    if ($('#searchInput')) $('#searchInput').value = '';
    if ($('#filterMarca')) $('#filterMarca').value = '';
    if ($('#filterCombustivel')) $('#filterCombustivel').value = '';
    if ($('#filterCambio')) $('#filterCambio').value = '';
    if ($('#filterAnoMin')) $('#filterAnoMin').value = '';
    if ($('#filterPrecoMax')) $('#filterPrecoMax').value = '';
    aplicarFiltrosLocais();
    carregarCarros(false);
}

function renderizarCarros(carros) {
    const grid = $('#carGrid');
    const emptyState = $('#emptyState');

    if (!carros || carros.length === 0) {
        grid.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    grid.innerHTML = carros
        .map((carro) => {
            const badges = [];
            if (carro.destaque) badges.push('<span class="badge badge-destaque">⭐ Destaque</span>');
            if (carro.vendido) badges.push('<span class="badge badge-vendido">Vendido</span>');
            if (carro.combustivel)
                badges.push(`<span class="badge badge-combustivel">⛽ ${carro.combustivel}</span>`);

            const imgContent = carro.imagem ?
                `<img src="${escapeHtml(carro.imagem)}" alt="${escapeHtml(carro.modelo)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'no-image\\'><i class=\\'fas fa-car-side\\'></i></div>'">` :
                `<div class="no-image"><i class="fas fa-car-side"></i></div>`;

            const acoes = currentUser ?
                `
                <button class="btn btn-outline btn-detalhes" data-id="${carro.id}">
                    <i class="fas fa-eye"></i> Ver
                </button>
                <button class="btn btn-outline btn-editar" data-id="${carro.id}">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn btn-danger btn-excluir" data-id="${carro.id}">
                    <i class="fas fa-trash"></i>
                </button>
            ` :
                `
                <button class="btn btn-outline btn-detalhes btn-block" data-id="${carro.id}">
                    <i class="fas fa-eye"></i> Ver detalhes
                </button>
            `;

            return `
                <article class="car-card" data-id="${carro.id}">
                    <div class="car-card-img">
                        ${imgContent}
                    </div>
                    ${badges.length ? `<div class="car-card-badge">${badges.join('')}</div>` : ''}
                    <div class="car-card-body">
                        <h3 class="car-card-title">${escapeHtml(carro.marca)} ${escapeHtml(carro.modelo)}</h3>
                        <p class="car-card-subtitle">Ano ${carro.ano} • ${carro.cor || 'Cor não informada'}</p>
                        <p class="car-card-price">${formatarMoeda(carro.preco)}</p>
                        <div class="car-card-details">
                            <span><i class="fas fa-tachometer-alt"></i> ${formatarKm(carro.quilometragem)}</span>
                            <span><i class="fas fa-cog"></i> ${carro.cambio || 'N/I'}</span>
                        </div>
                        <div class="car-card-actions">
                            ${acoes}
                        </div>
                    </div>
                </article>
            `;
        })
        .join('');

    // Event listeners nos botões dos cards
    grid.querySelectorAll('.btn-detalhes').forEach((btn) => {
        btn.addEventListener('click', () => abrirDetalhes(btn.dataset.id));
    });
    grid.querySelectorAll('.btn-editar').forEach((btn) => {
        btn.addEventListener('click', () => {
            const carro = carrosCache.find((c) => c.id === btn.dataset.id);
            if (carro) abrirModalCarro(carro);
        });
    });
    grid.querySelectorAll('.btn-excluir').forEach((btn) => {
        btn.addEventListener('click', () => {
            const carro = carrosCache.find((c) => c.id === btn.dataset.id);
            if (carro) abrirConfirmacaoExclusao(carro);
        });
    });

    // Atualiza visibilidade das ações
    renderizarAcoesCards();
}

function abrirDetalhes(id) {
    const carro = carrosCache.find((c) => c.id === id);
    if (!carro) return;

    const content = $('#detalhesContent');
    const imgContent = carro.imagem ?
        `<img src="${escapeHtml(carro.imagem)}" alt="${escapeHtml(carro.modelo)}" class="detalhes-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` +
        `<div class="detalhes-img no-image-placeholder" style="display:none;"><i class="fas fa-car-side"></i></div>` :
        `<div class="detalhes-img no-image-placeholder"><i class="fas fa-car-side"></i></div>`;

    content.innerHTML = `
        <div class="detalhes-carro">
            ${imgContent}
            <h2>${escapeHtml(carro.marca)} ${escapeHtml(carro.modelo)}</h2>
            <p class="detalhes-preco">${formatarMoeda(carro.preco)}</p>
            ${carro.vendido ? '<span class="badge badge-vendido" style="display:inline-block;margin-bottom:0.8rem;">Vendido</span>' : ''}
            ${carro.destaque ? '<span class="badge badge-destaque" style="display:inline-block;margin-bottom:0.8rem;margin-left:0.3rem;">Destaque</span>' : ''}
            <div class="detalhes-info">
                <div class="info-item"><strong>Ano</strong> ${carro.ano}</div>
                <div class="info-item"><strong>Quilometragem</strong> ${formatarKm(carro.quilometragem)}</div>
                <div class="info-item"><strong>Combustível</strong> ${carro.combustivel || 'N/I'}</div>
                <div class="info-item"><strong>Câmbio</strong> ${carro.cambio || 'N/I'}</div>
                <div class="info-item"><strong>Cor</strong> ${carro.cor || 'N/I'}</div>
                <div class="info-item"><strong>Anunciante</strong> ${carro.userId === currentUser?.uid ? 'Você' : 'Outro vendedor'}</div>
            </div>
            ${carro.descricao ? `<p class="detalhes-descricao">${escapeHtml(carro.descricao)}</p>` : '<p style="color:#999;">Sem descrição.</p>'}
        </div>
    `;
    abrirModal('modalDetalhes');
}

// ==================== MARCAS PARA FILTRO ====================
async function carregarMarcasParaFiltro() {
    try {
        const snapshot = await db.collection('carros').get();
        const marcas = new Set();
        snapshot.docs.forEach((doc) => {
            const m = doc.data().marca;
            if (m) marcas.add(m);
        });
        const select = $('#filterMarca');
        if (select) {
            const sorted = [...marcas].sort();
            sorted.forEach((marca) => {
                const option = document.createElement('option');
                option.value = marca;
                option.textContent = marca;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.warn('Não foi possível carregar marcas para o filtro:', error.message);
    }
}

// ==================== UTILITÁRIOS ====================
function formatarMoeda(valor) {
    if (valor == null || isNaN(valor)) return 'R$ 0,00';
    return 'R$ ' + valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatarKm(km) {
    if (km == null || isNaN(km)) return '0 km';
    return km.toLocaleString('pt-BR') + ' km';
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function mostrarLoading(mostrar) {
    const loading = $('#loading');
    if (loading) loading.style.display = mostrar ? 'block' : 'none';
}

function showToast(mensagem, tipo = 'success') {
    const container = $('#toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    const icones = { success: '✅', error: '❌', warning: '⚠️' };
    toast.innerHTML = `${icones[tipo] || 'ℹ️'} ${mensagem}`;
    container.appendChild(toast);
    setTimeout(() => {
        if (toast.parentNode) toast.remove();
    }, 4000);
}

// ==================== REGRAS SUGERIDAS PARA O FIRESTORE ====================
/*
    Acesse o Console Firebase > Firestore Database > Regras
    e cole as regras abaixo para segurança básica:

    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        match /carros/{documentId} {
          allow read: if true;
          allow create: if request.auth != null
                        && request.resource.data.userId == request.auth.uid;
          allow update: if request.auth != null
                        && resource.data.userId == request.auth.uid;
          allow delete: if request.auth != null
                        && resource.data.userId == request.auth.uid;
        }
      }
    }
*/
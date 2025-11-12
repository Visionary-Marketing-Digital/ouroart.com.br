document.addEventListener('DOMContentLoaded', function () {
  const steps = Array.from(document.querySelectorAll('.step'));
  const stepTitle = document.getElementById('stepTitle');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const form = document.getElementById('multiStepForm');
  const progressBar = document.getElementById('progressBar'); // opcional, se tiver

  let current = 0;

  // ======== Funções principais ========

  function updateButtonsLayout() {
    if (current === 0) {
      prevBtn.style.display = 'none';
      nextBtn.style.margin = '0 auto';
    } else {
      prevBtn.style.display = 'inline-block';
      nextBtn.style.margin = '0';
    }
  }

  function showStep(index) {
    steps.forEach((s, i) => {
      s.style.display = i === index ? '' : 'none';
    });

    if (progressBar)
      progressBar.style.width = ((index + 1) / steps.length) * 100 + '%';

    const titles = ['Informações Pessoais', 'Perfil de Revenda', 'Endereço'];
    stepTitle.textContent = `Etapa ${index + 1} de ${steps.length} — ${titles[index] || ''}`;

    nextBtn.textContent = index === steps.length - 1 ? 'Iniciar Minha Revenda' : 'Continuar';
    updateButtonsLayout();
  }

  // ======== Máscaras ========
  try {
    IMask(document.getElementById('WhatsApp'), { mask: '(00) 00000-0000' });
    IMask(document.getElementById('CPF'), { mask: '000.000.000-00' });
    IMask(document.getElementById('CEP'), { mask: '00000-000' });
  } catch (e) {}

  // ======== Validação ========
  function validaCPF(cpf) {
    if (!cpf) return false;
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
    let soma = 0;
    for (let i = 0; i < 9; i++) soma += parseInt(cpf.charAt(i)) * (10 - i);
    let resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.charAt(9))) return false;
    soma = 0;
    for (let i = 0; i < 10; i++) soma += parseInt(cpf.charAt(i)) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    return resto === parseInt(cpf.charAt(10));
  }

  function validateField(el) {
    const name = el.name || el.id;
    const value = (el.value || '').trim();
    let valid = true;

    el.classList.remove('input-error');
    const msgEl = document.querySelector(`.error-message[data-for="${el.id || name}"]`);
    if (msgEl) msgEl.classList.remove('visible');

    if (el.hasAttribute('required') && !value) valid = false;
    if (valid && el.type === 'email') {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!re.test(value)) valid = false;
    }
    if (valid && el.id === 'WhatsApp') {
      const nums = value.replace(/\D/g, '');
      if (nums.length < 10) valid = false;
    }
    if (valid && el.id === 'CPF') {
      if (!validaCPF(value)) valid = false;
    }
    if (valid && el.id === 'CEP') {
      const nums = value.replace(/\D/g, '');
      if (nums.length !== 8) valid = false;
    }

    if (!valid) {
      el.classList.add('input-error');
      if (msgEl) msgEl.classList.add('visible');
    }
    return valid;
  }

  function validateStep(index) {
    const step = steps[index];
    const fields = step.querySelectorAll('input, select, textarea');
    let ok = true;

    for (const f of fields) {
      const valid = validateField(f);
      if (!valid && ok) f.focus();
      ok = ok && valid;
    }

    // regra extra de restrição
    if (ok && index === 1) {
      const restr = document.getElementById('Restricao');
      const aval = document.getElementById('Avalista');
      if (restr && aval && restr.value === 'Nome Sujo' && aval.value === 'Não tenho avalista') {
        alert('Atenção: Para prosseguir com restrições financeiras, é necessário ter um avalista disponível.');
        return false;
      }
    }

    return ok;
  }

  // valida ao sair do campo
  const allInputs = form.querySelectorAll('input, select, textarea');
  allInputs.forEach(inp => {
    inp.addEventListener('blur', () => validateField(inp));
  });

  // ======== Navegação ========
  prevBtn.addEventListener('click', () => {
    if (current > 0) {
      current--;
      showStep(current);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  nextBtn.addEventListener('click', () => {
    if (current < steps.length - 1) {
      const ok = validateStep(current);
      if (!ok) return;
      current++;
      showStep(current);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const ok = validateStep(current);
      if (!ok) return;
      // ======== Envio via Google Sheets ========
      const scriptURL = 'https://script.google.com/macros/s/AKfycbwe1Sa3Vo5SID95SOnSnE0bM3cJaoNrqzQak3HboxbR73bEigr0S26EakO4IacO6Z_u/exec';

      nextBtn.addEventListener('click', () => {
        if (current < steps.length - 1) {
          const ok = validateStep(current);
          if (!ok) return;
          current++;
          showStep(current);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          const ok = validateStep(current);
          if (!ok) return;

          const formData = new FormData(form);

          nextBtn.disabled = true;
          nextBtn.textContent = 'Enviando...';

          fetch(scriptURL, { method: 'POST', body: formData })
            .then(response => response.json())
            .then(result => {
              if (result.status === 'success') {
                alert('✅ Formulário enviado com sucesso!');
                form.reset();
                current = 0;
                showStep(current);
              } else {
                alert('❌ Erro ao enviar. Tente novamente.');
              }
            })
            .catch(error => {
              console.error('Erro no envio:', error);
              alert('⚠️ Falha na conexão. Tente novamente mais tarde.');
            })
            .finally(() => {
              nextBtn.disabled = false;
              nextBtn.textContent = 'Continuar';
            });
        }
      });
    }
  });

  // ======== Busca CEP ========
  document.addEventListener('DOMContentLoaded', () => {
  const cepInput = document.getElementById('CEP');
  if (cepInput) {
    cepInput.addEventListener('blur', () => {
      const cep = cepInput.value.replace(/\D/g, '');
      if (cep.length === 8) buscaCEP(cep);
    });
  }
});

async function buscaCEP(cep) {
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await response.json();

    if (!data.erro) {
      const campos = {
        Endereco: data.logradouro,
        Bairro: data.bairro,
        Cidade: data.localidade,
        Estado: data.uf
      };

      for (const [id, valor] of Object.entries(campos)) {
        const el = document.getElementById(id);
        if (el) {
          el.value = valor || '';
          // deixa texto preto e borda verde
          el.style.color = '#000';
          el.style.borderColor = '#005c26';
          el.classList.add('valid');
          const icon = el.parentElement.querySelector('i');
          if (icon) icon.style.color = '#005c26';
        }
      }

      // deixa o próprio CEP verde
      const cepEl = document.getElementById('CEP');
      cepEl.style.borderColor = '#005c26';
      cepEl.classList.add('valid');
      const iconCep = cepEl.parentElement.querySelector('i');
      if (iconCep) iconCep.style.color = '#005c26';
    }
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
  }
}


  const cepEl = document.getElementById('CEP');
  if (cepEl) {
    cepEl.addEventListener('blur', (e) => {
      buscaCEP(e.target.value);
      validateField(cepEl);
    });
  }

  // Aplica cores apenas após interação
  document.querySelectorAll('.input-ouroart').forEach(input => {
    input.addEventListener('blur', () => {
      const icon = input.parentElement.querySelector('i'); // pega o ícone dentro do mesmo container
      const value = input.value.trim();

      // Se o campo foi tocado e está vazio
      if (value === '') {
        input.classList.remove('valid');
        input.classList.add('invalid');
        if (icon) icon.style.color = '#c90d1c'; // vermelho
      }
      // Se o campo está preenchido corretamente
      else {
        input.classList.remove('invalid');
        input.classList.add('valid');
        if (icon) icon.style.color = '#005c26ff'; // verde
      }
    });
  });

  // ======== Inicialização ========
  showStep(current);
});


      document.addEventListener('DOMContentLoaded', function () {
        // Elements
        const steps = Array.from(document.querySelectorAll('.step'));
        const progressBar = document.getElementById('progressBar');
        const stepTitle = document.getElementById('stepTitle');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const form = document.getElementById('multiStepForm');

        let current = 0;

        // show/hide steps
        function showStep(index) {
          steps.forEach((s, i) => {
            if (i === index) {
              s.style.display = '';
            } else {
              s.style.display = 'none';
            }
          });

          progressBar.style.width = ((index + 1) / steps.length) * 100 + '%';
          // step title text
          const titles = ['Informações Pessoais', 'Perfil de Revenda', 'Endereço'];
          stepTitle.textContent = `Etapa ${index + 1} de ${steps.length} — ${titles[index] || ''}`;

          prevBtn.style.display = index === 0 ? 'none' : '';
          nextBtn.textContent = index === steps.length - 1 ? 'Enviar' : 'Continuar';
        }

        // Masks
        try {
          IMask(document.getElementById('WhatsApp'), { mask: '(00) 00000-0000' });
          IMask(document.getElementById('CPF'), { mask: '000.000.000-00' });
          IMask(document.getElementById('CEP'), { mask: '00000-000' });
        } catch (e) { /* inputs may not exist; ignore */ }

        // Validate single field
        function validateField(el) {
          const name = el.name || el.id;
          const value = (el.value || '').trim();
          let valid = true;
          // clear
          el.classList.remove('input-error');
          const msgEl = document.querySelector(`.error-message[data-for="${el.id || name}"]`);
          if (msgEl) msgEl.classList.remove('visible');

          if (el.hasAttribute('required')) {
            if (!value) valid = false;
          }
          // type-specific checks
          if (valid && el.type === 'email') {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!re.test(value)) valid = false;
          }
          if (valid && (el.id === 'WhatsApp')) {
            const nums = value.replace(/\D/g, '');
            if (nums.length < 10) valid = false;
          }
          if (valid && (el.id === 'CPF')) {
            if (!validaCPF(value)) valid = false;
          }
          if (valid && (el.id === 'CEP')) {
            const nums = value.replace(/\D/g, '');
            if (nums.length !== 8) valid = false;
          }

          if (!valid) {
            el.classList.add('input-error');
            if (msgEl) msgEl.classList.add('visible');
          }
          return valid;
        }

        // Validate all visible fields in current step
        function validateStep(index) {
          const step = steps[index];
          const fields = step.querySelectorAll('input, select, textarea');
          let ok = true;
          for (const f of fields) {
            // Skip optional fields when not required
            if (!f.hasAttribute('required')) {
              // but still run CPF check if it's CPF field even optional (we set required earlier)
            }
            const valid = validateField(f);
            if (!valid && ok) {
              // focus first invalid
              f.focus();
            }
            ok = ok && valid;
          }

          // Extra business rule: if Restricao == 'Nome Sujo' and Avalista == 'Não tenho avalista' -> show modal/message (same behavior as React)
          if (ok && index === 1) {
            const restr = document.getElementById('Restricao');
            const aval = document.getElementById('Avalista');
            if (restr && aval && restr.value === 'Nome Sujo' && aval.value === 'Não tenho avalista') {
              // show a simple alert modal (we'll use browser alert to avoid adding UI libs)
              alert('Atenção: Para prosseguir com restrições financeiras, é necessário ter um avalista disponível.');
              return false;
            }
          }

          return ok;
        }

        // per-field on blur validation
        const allInputs = form.querySelectorAll('input, select, textarea');
        allInputs.forEach(inp => {
          inp.addEventListener('blur', () => validateField(inp));
        });

        // Prev/Next handlers
        prevBtn.addEventListener('click', () => {
          if (current > 0) {
            current--;
            showStep(current);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        });

        nextBtn.addEventListener('click', () => {
          // if not last step -> validate current and advance
          if (current < steps.length - 1) {
            const ok = validateStep(current);
            if (!ok) return;
            current++;
            showStep(current);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            // last step -> validate final and submit
            const ok = validateStep(current);
            if (!ok) return;
            // form is valid — perform submit action.
            // If you use Google Apps Script endpoint, replace action or add fetch here.
            // For now submit normally (action="#" will just reload); you can adapt to your Apps Script.
            form.submit();
          }
        });

        // CEP lookup (viacep)
        async function buscaCEP(cep) {
          const clean = (cep || '').replace(/\D/g, '');
          if (clean.length !== 8) return;
          try {
            const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
            const data = await res.json();
            if (!data.erro) {
              if (data.uf) document.getElementById('Estado').value = data.uf;
              if (data.localidade) document.getElementById('Cidade').value = data.localidade;
              if (data.bairro) document.getElementById('Bairro').value = data.bairro;
              if (data.logradouro) document.getElementById('Endereco').value = data.logradouro;
              // validate those fields visually off
              ['Estado','Cidade','Bairro','Endereco'].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                  el.classList.remove('input-error');
                  const m = document.querySelector(`.error-message[data-for="${id}"]`);
                  if (m) m.classList.remove('visible');
                }
              });
            }
          } catch (e) {
            console.error('Erro ao consultar CEP', e);
          }
        }

        const cepEl = document.getElementById('CEP');
        if (cepEl) {
          cepEl.addEventListener('blur', (e) => {
            buscaCEP(e.target.value);
            validateField(cepEl);
          });
        }

        // CPF validation function
        function validaCPF(cpf) {
          if (!cpf) return false;
          cpf = cpf.replace(/[^\d]+/g,'');
          if (cpf.length !== 11) return false;
          if (/^(\d)\1+$/.test(cpf)) return false;
          let sum = 0;
          for (let i = 0; i < 9; i++) sum += parseInt(cpf.charAt(i)) * (10 - i);
          let resto = (sum * 10) % 11;
          if (resto === 10 || resto === 11) resto = 0;
          if (resto !== parseInt(cpf.charAt(9))) return false;
          sum = 0;
          for (let i = 0; i < 10; i++) sum += parseInt(cpf.charAt(i)) * (11 - i);
          resto = (sum * 10) % 11;
          if (resto === 10 || resto === 11) resto = 0;
          return resto === parseInt(cpf.charAt(10));
        }

        // Ajusta visibilidade e posição dos botões dinamicamente
        function updateButtonsLayout() {
          if (current === 0) {
            prevBtn.style.display = 'none';
            nextBtn.style.margin = '0 auto'; // centraliza sozinho
          } else {
            prevBtn.style.display = 'inline-block';
            nextBtn.style.margin = '0'; // alinha ao lado do voltar
          }
        }

        // Atualiza layout sempre que muda de etapa
        function showStep(index) {
          steps.forEach((s, i) => {
            s.style.display = i === index ? '' : 'none';
          });

          progressBar.style.width = ((index + 1) / steps.length) * 100 + '%';

          const titles = ['Informações Pessoais', 'Perfil de Revenda', 'Endereço'];
          stepTitle.textContent = `Etapa ${index + 1} de ${steps.length} — ${titles[index] || ''}`;

          nextBtn.textContent = index === steps.length - 1 ? 'Enviar' : 'Continuar';
          updateButtonsLayout(); // 🔥 aqui é o segredo
        }


        // Initialize
        showStep(current);
      });
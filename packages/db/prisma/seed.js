"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const bcryptjs_1 = __importDefault(require("bcryptjs"));

// Collect candidate URLs in priority order (PG_URL_1..9, then DATABASE_URL)
function getCandidateUrls() {
  const urls = [];
  for (let i = 1; i <= 9; i++) {
    const u = process.env["PG_URL_" + i];
    if (u) urls.push(u);
  }
  if (process.env.DATABASE_URL && !urls.includes(process.env.DATABASE_URL)) {
    urls.push(process.env.DATABASE_URL);
  }
  return urls;
}

async function createConnectedPrisma() {
  const urls = getCandidateUrls();
  if (urls.length === 0) throw new Error("No database URLs configured");
  let lastError;
  for (const url of urls) {
    const masked = url.replace(/:[^:@]+@/, ":***@");
    const adapter = new adapter_pg_1.PrismaPg({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
    });
    const client = new client_1.PrismaClient({ adapter });
    try {
      await Promise.race([
        client.$queryRaw`SELECT 1`,
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
      ]);
      console.log("   ✅ Conectado a:", masked);
      return client;
    } catch (e) {
      console.log("   ⚠️  No reachable:", masked);
      await client.$disconnect().catch(() => {});
      lastError = e;
    }
  }
  throw lastError || new Error("All database URLs failed");
}

let prisma;
async function main() {
  console.log("🌱 Seeding database...");
  console.log("   Probando conexiones a bases de datos...");
  prisma = await createConnectedPrisma();
  const defaultPassword = await bcryptjs_1.default.hash("123456", 10);
  // ============ USERS ============
  const admin = await prisma.user.upsert({
    where: { email: "admin@paygas.com.br" },
    update: {},
    create: {
      email: "admin@paygas.com.br",
      nome: "Administrador PayGas",
      senha: defaultPassword,
      role: "ADMIN",
      emailVerificado: true,
    },
  });
  const gestor = await prisma.user.upsert({
    where: { email: "gestor@paygas.com.br" },
    update: {},
    create: {
      email: "gestor@paygas.com.br",
      nome: "Carlos Mendes",
      senha: defaultPassword,
      role: "GESTOR",
      emailVerificado: true,
    },
  });
  const atendente1 = await prisma.user.upsert({
    where: { email: "atendente@paygas.com.br" },
    update: {},
    create: {
      email: "atendente@paygas.com.br",
      nome: "Ana Paula Costa",
      senha: defaultPassword,
      role: "ATENDENTE",
      gestorId: gestor.id,
      emailVerificado: true,
    },
  });
  const atendente2 = await prisma.user.upsert({
    where: { email: "joao@paygas.com.br" },
    update: {},
    create: {
      email: "joao@paygas.com.br",
      nome: "Joao Silva",
      senha: defaultPassword,
      role: "ATENDENTE",
      gestorId: gestor.id,
      emailVerificado: true,
    },
  });
  const atendente3 = await prisma.user.upsert({
    where: { email: "maria@paygas.com.br" },
    update: {},
    create: {
      email: "maria@paygas.com.br",
      nome: "Maria Santos",
      senha: defaultPassword,
      role: "ATENDENTE",
      gestorId: gestor.id,
      emailVerificado: true,
    },
  });
  console.log("✅ Users created");
  // ============ CURSO: EXCELencia NO ATENDIMENTO ============
  const cursoData = {
    titulo: "Excelencia no Atendimento",
    descricao:
      "Curso completo de treinamento em atendimento ao cliente para postos de combustivel. Aprenda tecnicas de comunicacao, resolucao de conflitos e vendas consultivas.",
    ordem: 1,
  };
  let curso = await prisma.curso.findFirst({
    where: { titulo: cursoData.titulo },
  });
  if (!curso) {
    curso = await prisma.curso.create({
      data: cursoData,
    });
  }
  // ============ AULAS COM 3 LEICOES E QUIZ ============
  const aulasData = [
    {
      titulo: "Fundamentos do Atendimento",
      descricao:
        "Conceitos basicos de atendimento ao cliente, importancia da primeira impressao e tecnicas de boas-vindas.",
      ordem: 1,
      duracaoMin: 15,
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      videoInicio: 0,
      videoFim: 300,
      quiz: {
        titulo: "Quiz: Fundamentos do Atendimento",
        autoGerarCertificado: false,
        perguntas: [
          {
            pergunta:
              "Qual e a importancia da primeira impressao no atendimento?",
            opcaoA: "Nao tem importancia",
            opcaoB: "E critica para a percepcao do cliente",
            opcaoC: "Apenas para clientes novos",
            opcaoD: "So em vendas high-value",
            correta: "B",
          },
          {
            pergunta: "Como devemos cumprimentar o cliente?",
            opcaoA: "Ola, tudo bem?",
            opcaoB: "Oi",
            opcaoC: "Bem-vindo a PayGas! Como posso ajudar?",
            opcaoD: "Depende do humor",
            correta: "C",
          },
          {
            pergunta: "Qual e o objetivo do atendimento excepcional?",
            opcaoA: "Vender mais",
            opcaoB: "Satisfazer e fidelizar o cliente",
            opcaoC: "Terminar rapido",
            opcaoD: "Seguir o manual",
            correta: "B",
          },
        ],
      },
    },
    {
      titulo: "Comunicacao Eficaz",
      descricao:
        "Tecnicas de comunicacao verbal e nao-verbal, escuta ativa e empatia no atendimento.",
      ordem: 2,
      duracaoMin: 20,
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      videoInicio: 300,
      videoFim: 600,
      quiz: {
        titulo: "Quiz: Comunicacao Eficaz",
        autoGerarCertificado: false,
        perguntas: [
          {
            pergunta: "O que e escuta ativa?",
            opcaoA: "Ouvir enquanto faz outra coisa",
            opcaoB: "Prestar atencao total ao que o cliente diz",
            opcaoC: "Apenas concordar",
            opcaoD: "Interromper quando necessario",
            correta: "B",
          },
          {
            pergunta: "Qual linguagem corporal transmite confianca?",
            opcaoA: "Bracos cruzados",
            opcaoB: "Evitar contato visual",
            opcaoC: "Postura aberta e contato visual",
            opcaoD: "Olhar para o celular",
            correta: "C",
          },
          {
            pergunta: "Como demonstrar empatia no atendimento?",
            opcaoA: "Dizer que entende sem entender",
            opcaoB: "Colocar-se no lugar do cliente",
            opcaoC: "Seguir o script",
            opcaoD: "Ignorar o problema",
            correta: "B",
          },
        ],
      },
    },
    {
      titulo: "Resolucao de Conflitos",
      descricao:
        "Estrategias para lidar com clientes insatisfeitos, reclamacoes e situacoes dificeis.",
      ordem: 3,
      duracaoMin: 25,
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      videoInicio: 600,
      videoFim: 900,
      quiz: {
        titulo: "Quiz: Resolucao de Conflitos",
        autoGerarCertificado: false,
        perguntas: [
          {
            pergunta:
              "Qual e o primeiro passo ao atender um cliente insatisfeito?",
            opcaoA: "Discutir",
            opcaoB: "Ouvir o cliente com atencao",
            opcaoC: "Chamar o gerente",
            opcaoD: "Ignorar",
            correta: "B",
          },
          {
            pergunta: "O que NAO devemos fazer em um conflito?",
            opcaoA: "Manter calma",
            opcaoB: "Demonstrar empatia",
            opcaoC: "Culpar o cliente",
            opcaoD: "Buscar solucao",
            correta: "C",
          },
          {
            pergunta: "Qual tecnica ajuda a acalmar o cliente?",
            opcaoA: "Falar mais alto",
            opcaoB: 'Repetir "nao tenho culpa"',
            opcaoC: "Validar o sentimento do cliente",
            opcaoD: "Pedir para sair",
            correta: "C",
          },
        ],
      },
    },
    {
      titulo: "Vendas Consultivas e Cross-selling",
      descricao:
        "Tecnicas de vendas adicionais, sugestoes inteligentes e aument ticket medio.",
      ordem: 4,
      duracaoMin: 20,
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      videoInicio: 900,
      videoFim: 1200,
      quiz: {
        titulo: "Quiz: Vendas Consultivas",
        autoGerarCertificado: true,
        perguntas: [
          {
            pergunta: "O que e cross-selling?",
            opcaoA: "Vender mais caro",
            opcaoB: "Sugerir produtos complementares",
            opcaoC: "Descontar produtos",
            opcaoD: "Vender para concorrentes",
            correta: "B",
          },
          {
            pergunta: "Qual a melhor hora para sugerir um adicional?",
            opcaoA: "Antes do pagamento",
            opcaoB: "Durante o abastecimento, de forma natural",
            opcaoC: "Apos o cliente sair",
            opcaoD: "Nunca",
            correta: "B",
          },
          {
            pergunta: "Como aumentar o ticket medio?",
            opcaoA: "Aumentar precos",
            opcaoB: "Ignorar o cliente",
            opcaoC: "Sugerir produtos relevantes com valor",
            opcaoD: "Nao oferecer opcoes",
            correta: "C",
          },
        ],
      },
    },
  ];
  for (const aulaData of aulasData) {
    let aula = await prisma.aula.findFirst({
      where: { titulo: aulaData.titulo, cursoId: curso.id },
    });
    if (!aula) {
      const { quiz, ...aulaInfo } = aulaData;
      aula = await prisma.aula.create({
        data: {
          cursoId: curso.id,
          titulo: aulaInfo.titulo,
          descricao: aulaInfo.descricao,
          ordem: aulaInfo.ordem,
          duracaoMin: aulaInfo.duracaoMin,
          videoUrl: aulaInfo.videoUrl,
          videoInicio: aulaInfo.videoInicio,
          videoFim: aulaInfo.videoFim,
        },
      });
      const existingQuiz = await prisma.quiz.findUnique({
        where: { aulaId: aula.id },
      });
      if (!existingQuiz) {
        const createdQuiz = await prisma.quiz.create({
          data: {
            aulaId: aula.id,
            titulo: quiz.titulo,
            autoGerarCertificado: quiz.autoGerarCertificado,
          },
        });
        for (let i = 0; i < quiz.perguntas.length; i++) {
          const p = quiz.perguntas[i];
          await prisma.quizPergunta.create({
            data: {
              quizId: createdQuiz.id,
              pergunta: p.pergunta,
              opcaoA: p.opcaoA,
              opcaoB: p.opcaoB,
              opcaoC: p.opcaoC || null,
              opcaoD: p.opcaoD || null,
              correta: p.correta,
              ordem: i + 1,
            },
          });
        }
      }
    }
  }
  console.log(
    "✅ Curso Excelencia created with 4 aulas, 4 quizzes, 12 questions",
  );
  // ============ CURSO: SEGURANCA E NORMAS ============
  const curso2Data = {
    titulo: "Seguranca e Normas",
    descricao:
      "Capacitação em seguranca do trabalho, normas ABNT, procedimentos de emergencia e prevencao de acidentes em postos de combustivel.",
    ordem: 2,
  };
  let curso2 = await prisma.curso.findFirst({
    where: { titulo: curso2Data.titulo },
  });
  if (!curso2) {
    curso2 = await prisma.curso.create({
      data: curso2Data,
    });
  }
  const aulas2Data = [
    {
      titulo: "Introducao a Seguranca no Trabalho",
      descricao:
        "Conceitos basicos de seguranca do trabalho, principais riscos em postos de combustivel e importancia das normas de seguranca.",
      ordem: 1,
      duracaoMin: 15,
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      videoInicio: 0,
      videoFim: 300,
      quiz: {
        titulo: "Quiz: Introducao a Seguranca",
        autoGerarCertificado: false,
        perguntas: [
          {
            pergunta: "Qual o principal risco em um posto de combustivel?",
            opcaoA: "Queda de altura",
            opcaoB: "Incendio e explosao",
            opcaoC: "Golpe de calor",
            opcaoD: "Queda de objeto",
            correta: "B",
          },
          {
            pergunta: "O que significa EPI?",
            opcaoA: "Equipamento de Protecao Individual",
            opcaoB: "Extintor de Protecao Interno",
            opcaoC: "Evento de Prevencao de Incendios",
            opcaoD: "Estrutura de Protecao de Infantaria",
            correta: "A",
          },
          {
            pergunta: "Qual o primeiro passo ao perceber um risco?",
            opcaoA: "Ignorar",
            opcaoB: "Reportar ao supervisor",
            opcaoC: "Continuar trabalhando",
            opcaoD: "Esperar alguem resolver",
            correta: "B",
          },
        ],
      },
    },
    {
      titulo: "Equipamentos de Protecao Individual",
      descricao:
        "Tipos de EPI, uso correto, conservacao e substituicao. Foco em luvas, oculos, calcados de seguranca e roupas ignifugadas.",
      ordem: 2,
      duracaoMin: 20,
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      videoInicio: 300,
      videoFim: 600,
      quiz: {
        titulo: "Quiz: EPIs",
        autoGerarCertificado: false,
        perguntas: [
          {
            pergunta: "Qual EPI e obrigatorio ao abastecer?",
            opcaoA: "Capacete",
            opcaoB: "Luvas e oculos de protecao",
            opcaoC: "Avental",
            opcaoD: "Mascara",
            correta: "B",
          },
          {
            pergunta: "Quando devo trocar meu EPI?",
            opcaoA: "Apenas quando quebrar",
            opcaoB: "Quando estiver danificado ou vencido",
            opcaoC: "Nunca",
            opcaoD: "A cada 5 anos",
            correta: "B",
          },
          {
            pergunta: "Quem e responsavel pela distribuicao de EPIs?",
            opcaoA: "O funcionario",
            opcaoB: "O cliente",
            opcaoC: "O empregador",
            opcaoD: "Ninguem",
            correta: "C",
          },
        ],
      },
    },
    {
      titulo: "Procedimentos de Emergencia",
      descricao:
        "Plano de emergencia, rotas de fuga, uso de extintores, acionamento de bombeiros e comunicacao de incidentes.",
      ordem: 3,
      duracaoMin: 25,
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      videoInicio: 600,
      videoFim: 900,
      quiz: {
        titulo: "Quiz: Emergencias",
        autoGerarCertificado: false,
        perguntas: [
          {
            pergunta: "Qual o numero da Brigada de Incendio?",
            opcaoA: "190",
            opcaoB: "193",
            opcaoC: "192",
            opcaoD: "197",
            correta: "A",
          },
          {
            pergunta: "Ao detectar um incendio, qual a primeira acao?",
            opcaoA: "Tentar apagar sozinho",
            opcaoB: "Acionar alarme e evacuar",
            opcaoC: "Fotografar",
            opcaoD: "Esperar esfriar",
            correta: "B",
          },
          {
            pergunta: "Onde ficam localizados os extintores?",
            opcaoA: "No escritorio apenas",
            opcaoB: "Em pontos estrategicos sinalizados",
            opcaoC: "No deposito",
            opcaoD: "No estacionamento",
            correta: "B",
          },
        ],
      },
    },
    {
      titulo: "Normas ABNT e Certificacoes",
      descricao:
        "Principais normas ABNT aplicaveis a postos de combustivel, certificacoes obrigatorias e auditorias de seguranca.",
      ordem: 4,
      duracaoMin: 20,
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      videoInicio: 900,
      videoFim: 1200,
      quiz: {
        titulo: "Quiz: Normas ABNT",
        autoGerarCertificado: true,
        perguntas: [
          {
            pergunta: "Qual norma trata de EPIs?",
            opcaoA: "NBR 15834",
            opcaoB: "NR-6",
            opcaoC: "ABNT NBR 14000",
            opcaoD: "ISO 9001",
            correta: "B",
          },
          {
            pergunta:
              "A cada quanto tempo deve ser feita a auditoria de seguranca?",
            opcaoA: "A cada 10 anos",
            opcaoB: "A cada 2 anos",
            opcaoC: "Anualmente",
            opcaoD: "Nunca",
            correta: "C",
          },
          {
            pergunta:
              "Qual certificacao e importante para postos de combustivel?",
            opcaoA: "ISO 14001",
            opcaoB: "NBR 15834",
            opcaoC: "Todas as anteriores",
            opcaoD: "Nenhuma",
            correta: "C",
          },
        ],
      },
    },
  ];
  for (const aulaData of aulas2Data) {
    let aula = await prisma.aula.findFirst({
      where: { titulo: aulaData.titulo, cursoId: curso2.id },
    });
    if (!aula) {
      const { quiz, ...aulaInfo } = aulaData;
      aula = await prisma.aula.create({
        data: {
          cursoId: curso2.id,
          titulo: aulaInfo.titulo,
          descricao: aulaInfo.descricao,
          ordem: aulaInfo.ordem,
          duracaoMin: aulaInfo.duracaoMin,
          videoUrl: aulaInfo.videoUrl,
          videoInicio: aulaInfo.videoInicio,
          videoFim: aulaInfo.videoFim,
        },
      });
      const existingQuiz = await prisma.quiz.findUnique({
        where: { aulaId: aula.id },
      });
      if (!existingQuiz) {
        const createdQuiz = await prisma.quiz.create({
          data: {
            aulaId: aula.id,
            titulo: quiz.titulo,
            autoGerarCertificado: quiz.autoGerarCertificado,
          },
        });
        for (let i = 0; i < quiz.perguntas.length; i++) {
          const p = quiz.perguntas[i];
          await prisma.quizPergunta.create({
            data: {
              quizId: createdQuiz.id,
              pergunta: p.pergunta,
              opcaoA: p.opcaoA,
              opcaoB: p.opcaoB,
              opcaoC: p.opcaoC || null,
              opcaoD: p.opcaoD || null,
              correta: p.correta,
              ordem: i + 1,
            },
          });
        }
      }
    }
  }
  console.log(
    "✅ Curso Seguranca created with 4 aulas, 4 quizzes, 12 questions",
  );
  // ============ PROGRESSO DE EXEMPLO ============
  const allAulas = await prisma.aula.findMany({
    where: { cursoId: curso.id },
    orderBy: { ordem: "asc" },
  });
  if (allAulas[0]) {
    const existsP = await prisma.progresso.findFirst({
      where: {
        cursoId: curso.id,
        aulaId: allAulas[0].id,
        userId: atendente1.id,
      },
    });
    if (!existsP)
      await prisma.progresso.create({
        data: {
          cursoId: curso.id,
          aulaId: allAulas[0].id,
          userId: atendente1.id,
          concluido: true,
        },
      });
  }
  if (allAulas[1]) {
    const existsP = await prisma.progresso.findFirst({
      where: {
        cursoId: curso.id,
        aulaId: allAulas[1].id,
        userId: atendente1.id,
      },
    });
    if (!existsP)
      await prisma.progresso.create({
        data: {
          cursoId: curso.id,
          aulaId: allAulas[1].id,
          userId: atendente1.id,
          concluido: true,
        },
      });
  }
  if (allAulas[0]) {
    const existsP = await prisma.progresso.findFirst({
      where: {
        cursoId: curso.id,
        aulaId: allAulas[0].id,
        userId: atendente2.id,
      },
    });
    if (!existsP)
      await prisma.progresso.create({
        data: {
          cursoId: curso.id,
          aulaId: allAulas[0].id,
          userId: atendente2.id,
          concluido: true,
        },
      });
  }
  console.log("✅ Progresso de exemplo criado");
  // ============ XP PARA ATENDENTES ============
  await prisma.user.update({ where: { id: atendente1.id }, data: { xp: 280 } });
  await prisma.user.update({ where: { id: atendente2.id }, data: { xp: 80 } });
  await prisma.user.update({ where: { id: atendente3.id }, data: { xp: 10 } });
  // ============ POINTS TRANSACTIONS DE EXEMPLO ============
  const existingTrans1 = await prisma.pointsTransaction.findFirst({
    where: { userId: atendente1.id, action: "LOGIN" },
  });
  if (!existingTrans1) {
    await prisma.pointsTransaction.create({
      data: {
        userId: atendente1.id,
        action: "LOGIN",
        points: 10,
        details: "Acesso a plataforma",
      },
    });
    await prisma.pointsTransaction.create({
      data: {
        userId: atendente1.id,
        action: "MODULE_OPEN",
        points: 20,
        details: "Curso aberto: Excelencia no Atendimento",
      },
    });
    await prisma.pointsTransaction.create({
      data: {
        userId: atendente1.id,
        action: "LESSON_COMPLETE",
        points: 50,
        details: "Aula: Fundamentos do Atendimento",
      },
    });
    await prisma.pointsTransaction.create({
      data: {
        userId: atendente1.id,
        action: "QUIZ_PASS",
        points: 100,
        details: "Quiz aprovado com nota 10/10",
      },
    });
    await prisma.pointsTransaction.create({
      data: {
        userId: atendente1.id,
        action: "LESSON_COMPLETE",
        points: 50,
        details: "Aula: Comunicacao Eficaz",
      },
    });
    await prisma.pointsTransaction.create({
      data: {
        userId: atendente1.id,
        action: "QUIZ_PASS",
        points: 100,
        details: "Quiz aprovado com nota 7/10",
      },
    });
  }
  const existingTrans2 = await prisma.pointsTransaction.findFirst({
    where: { userId: atendente2.id, action: "LOGIN" },
  });
  if (!existingTrans2) {
    await prisma.pointsTransaction.create({
      data: {
        userId: atendente2.id,
        action: "LOGIN",
        points: 10,
        details: "Acesso a plataforma",
      },
    });
    await prisma.pointsTransaction.create({
      data: {
        userId: atendente2.id,
        action: "MODULE_OPEN",
        points: 20,
        details: "Curso aberto: Excelencia no Atendimento",
      },
    });
    await prisma.pointsTransaction.create({
      data: {
        userId: atendente2.id,
        action: "LESSON_COMPLETE",
        points: 50,
        details: "Aula: Fundamentos do Atendimento",
      },
    });
  }
  // ============ NOTIFICATION ============
  const existsN = await prisma.notification.findFirst({
    where: { fromId: admin.id, toId: atendente1.id },
  });
  if (!existsN)
    await prisma.notification.create({
      data: {
        fromId: admin.id,
        toId: atendente1.id,
        titulo: "Bem-vindo!",
        mensagem: "Sua conta foi criada na Academia PayGas!",
      },
    });
  // ============ ACTIVITY LOGS ============
  await prisma.activityLog.create({
    data: { userId: atendente1.id, acao: "Login", detalhes: "Primeiro acesso" },
  });
  await prisma.activityLog.create({
    data: {
      userId: atendente1.id,
      acao: "Curso Aberto",
      detalhes: "Excelencia no Atendimento",
    },
  });
  await prisma.activityLog.create({
    data: {
      userId: atendente1.id,
      acao: "Aula Concluida",
      detalhes: "Fundamentos do Atendimento",
    },
  });
  await prisma.activityLog.create({
    data: {
      userId: atendente1.id,
      acao: "Quiz Aprovado",
      detalhes: "Nota 10/10",
    },
  });
  await prisma.activityLog.create({
    data: { userId: atendente2.id, acao: "Login", detalhes: "Primeiro acesso" },
  });
  console.log("🎉 Seed completed with gamification data!");
}
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma && prisma.$disconnect());
//# sourceMappingURL=seed.js.map

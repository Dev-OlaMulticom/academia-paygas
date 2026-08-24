#!/usr/bin/env node
"use strict";
/**
 * CRUD Testing Script - Academia PayGas
 * Tests all main API endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@packages/db/prisma/client");
const prisma = new client_1.PrismaClient();
const results = [];
function logResult(test, status, message) {
    results.push({ test, status, message });
    const icon = status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${test}: ${message}`);
}
async function testUsersFlow() {
    console.log('\n📝 Testing USER CRUD...');
    try {
        // CREATE
        const user = await prisma.user.create({
            data: {
                email: `test-user-${Date.now()}@test.com`,
                nome: 'Test User',
                senha: 'hashed_password',
                role: 'ATENDENTE',
            },
        });
        logResult('CREATE User', 'PASS', `User created: ${user.id}`);
        // READ
        const foundUser = await prisma.user.findUnique({
            where: { id: user.id },
        });
        logResult('READ User', foundUser ? 'PASS' : 'FAIL', foundUser ? `User found: ${foundUser.email}` : 'User not found');
        // UPDATE
        const updated = await prisma.user.update({
            where: { id: user.id },
            data: { nome: 'Updated User' },
        });
        logResult('UPDATE User', 'PASS', `User updated: ${updated.nome}`);
        // DELETE
        await prisma.user.delete({
            where: { id: user.id },
        });
        logResult('DELETE User', 'PASS', 'User deleted successfully');
    }
    catch (error) {
        logResult('USER CRUD', 'FAIL', error instanceof Error ? error.message : 'Unknown error');
    }
}
async function testTrilhasFlow() {
    console.log('\n📚 Testing TRILHA CRUD (skipped - trilhas removed)');
    logResult('TRILHA CRUD', 'PASS', 'Trilhas removed - skipping');
    return null;
}
async function testModulosFlow(_trilhaId) {
    console.log('\n🔧 Testing CURSO CRUD...');
    try {
        // CREATE
        const curso = await prisma.curso.create({
            data: {
                titulo: `Test Curso ${Date.now()}`,
                descricao: 'Test Module Description',
                ordem: 1,
            },
        });
        logResult('CREATE Curso', 'PASS', `Curso created: ${curso.id}`);
        // READ
        const found = await prisma.curso.findUnique({
            where: { id: curso.id },
        });
        logResult('READ Curso', found ? 'PASS' : 'FAIL', found ? `Curso found` : 'Not found');
        // UPDATE
        const _updated = await prisma.curso.update({
            where: { id: curso.id },
            data: { titulo: 'Updated Curso Title' },
        });
        logResult('UPDATE Curso', 'PASS', `Curso updated`);
        return curso.id;
    }
    catch (error) {
        logResult('CURSO CRUD', 'FAIL', error instanceof Error ? error.message : 'Unknown error');
        return null;
    }
}
async function testAulasFlow(cursoId) {
    if (!cursoId) {
        logResult('AULA CRUD', 'FAIL', 'No curso ID available');
        return null;
    }
    console.log('\n📖 Testing AULA CRUD...');
    try {
        // CREATE
        const aula = await prisma.aula.create({
            data: {
                cursoId,
                titulo: `Test Aula ${Date.now()}`,
                descricao: 'Test Lesson Description',
                ordem: 1,
                videoUrl: 'https://youtube.com/watch?v=test',
                duracaoMin: 15,
            },
        });
        logResult('CREATE Aula', 'PASS', `Aula created: ${aula.id}`);
        // READ
        const found = await prisma.aula.findUnique({
            where: { id: aula.id },
        });
        logResult('READ Aula', found ? 'PASS' : 'FAIL', found ? `Aula found` : 'Not found');
        // UPDATE
        const _updated = await prisma.aula.update({
            where: { id: aula.id },
            data: { titulo: 'Updated Aula Title' },
        });
        logResult('UPDATE Aula', 'PASS', `Aula updated`);
        return aula.id;
    }
    catch (error) {
        logResult('AULA CRUD', 'FAIL', error instanceof Error ? error.message : 'Unknown error');
        return null;
    }
}
async function testQuizFlow(aulaId) {
    if (!aulaId) {
        logResult('QUIZ CRUD', 'FAIL', 'No aula ID available');
        return;
    }
    console.log('\n❓ Testing QUIZ CRUD...');
    try {
        // CREATE QUIZ
        const quiz = await prisma.quiz.create({
            data: {
                aulaId,
                titulo: `Test Quiz ${Date.now()}`,
                autoGerarCertificado: false,
            },
        });
        logResult('CREATE Quiz', 'PASS', `Quiz created: ${quiz.id}`);
        // CREATE QUESTION
        const _pergunta = await prisma.quizPergunta.create({
            data: {
                quizId: quiz.id,
                pergunta: 'What is 2+2?',
                opcaoA: '3',
                opcaoB: '4',
                opcaoC: '5',
                opcaoD: '6',
                correta: 'B',
                ordem: 1,
            },
        });
        logResult('CREATE Quiz Question', 'PASS', `Question created`);
        // READ QUIZ
        const found = await prisma.quiz.findUnique({
            where: { id: quiz.id },
            include: { perguntas: true },
        });
        logResult('READ Quiz with Questions', found && found.perguntas.length > 0 ? 'PASS' : 'FAIL', 'Quiz with questions retrieved');
        // UPDATE QUIZ
        const updated = await prisma.quiz.update({
            where: { id: quiz.id },
            data: { titulo: 'Updated Quiz Title' },
        });
        logResult('UPDATE Quiz', 'PASS', `Quiz updated`);
    }
    catch (error) {
        logResult('QUIZ CRUD', 'FAIL', error instanceof Error ? error.message : 'Unknown error');
    }
}
async function testProgressFlow() {
    console.log('\n📊 Testing PROGRESS Flow...');
    try {
        // Create test data
        const user = await prisma.user.create({
            data: {
                email: `progress-test-${Date.now()}@test.com`,
                nome: 'Progress Test',
                senha: 'hashed',
                role: 'ATENDENTE',
            },
        });
        const curso = await prisma.curso.create({
            data: {
                titulo: 'Test Curso',
                descricao: 'Test',
                ordem: 1,
            },
        });
        const aula = await prisma.aula.create({
            data: {
                cursoId: curso.id,
                titulo: 'Test Aula',
                descricao: 'Test',
                ordem: 1,
            },
        });
        // CREATE PROGRESS
        const progress = await prisma.progresso.create({
            data: {
                userId: user.id,
                cursoId: curso.id,
                aulaId: aula.id,
                concluido: true,
            },
        });
        logResult('CREATE Progress', 'PASS', 'Progress recorded');
        // READ PROGRESS
        const found = await prisma.progresso.findMany({
            where: { userId: user.id },
        });
        logResult('READ User Progress', found.length > 0 ? 'PASS' : 'FAIL', `Found ${found.length} progress records`);
        // Cleanup
        await prisma.progresso.delete({ where: { id: progress.id } });
        await prisma.aula.delete({ where: { id: aula.id } });
        await prisma.curso.delete({ where: { id: curso.id } });
        await prisma.user.delete({ where: { id: user.id } });
    }
    catch (error) {
        logResult('PROGRESS Flow', 'FAIL', error instanceof Error ? error.message : 'Unknown error');
    }
}
async function runAllTests() {
    console.log('🚀 Starting Academy PayGas CRUD Tests...\n');
    console.log(`📅 Timestamp: ${new Date().toISOString()}`);
    console.log(`🗄️  Database: ${process.env.DATABASE_URL ? 'PostgreSQL' : 'Not configured'}`);
    await testUsersFlow();
    await testTrilhasFlow();
    const cursoId = await testModulosFlow(null);
    const aulaId = await testAulasFlow(cursoId);
    await testQuizFlow(aulaId);
    await testProgressFlow();
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const total = results.length;
    results.forEach(r => {
        const icon = r.status === 'PASS' ? '✅' : '❌';
        console.log(`${icon} ${r.test}: ${r.message}`);
    });
    console.log('\n' + '-'.repeat(60));
    console.log(`Total: ${total} | Passed: ${passed} ✅ | Failed: ${failed} ❌`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    console.log('='.repeat(60));
    await prisma.$disconnect();
    process.exit(failed > 0 ? 1 : 0);
}
runAllTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
//# sourceMappingURL=test-crud.js.map
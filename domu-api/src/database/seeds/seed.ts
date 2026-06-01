import { AppDataSource } from '../data-source';
import { Role } from '@/role/entities/role.entity';

async function runSeed() {
  await AppDataSource.initialize();
  const roleRepo = AppDataSource.getRepository(Role);

  const roles = [
    { name: 'OWNER', description: 'Administrador del hogar' },
    { name: 'MEMBER', description: 'Miembro del hogar' },
    { name: 'GUEST', description: 'Usuario no perteneciente a un hogar' },
  ];

  for (const role of roles) {
    const exists = await roleRepo.findOneBy({ name: role.name });
    if (!exists) await roleRepo.save(roleRepo.create(role));
  }

  console.log('Seed completado');
  await AppDataSource.destroy();
}

runSeed().catch((err) => {
  console.error('Seed falló:', err);
  process.exit(1);
});
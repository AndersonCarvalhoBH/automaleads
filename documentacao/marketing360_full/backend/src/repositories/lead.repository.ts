import prisma from '../lib/prisma';

export default {
  findById(id: string) {
    return prisma.lead.findUnique({ where: { id } });
  }
};

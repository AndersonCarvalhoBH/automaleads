import prisma from '../lib/prisma';

const LeadService = {
  async create(payload: any) {
    // minimal normalization example
    const accountId = payload.accountId || payload.account || 'default-account';
    const data = {
      accountId,
      name: payload.name || null,
      email: payload.email || null,
      phone: payload.phone || null,
      source: payload.source || 'api',
      data: payload.data || {}
    };
    // dedup basic: by email
    if (data.email) {
      const existing = await prisma.lead.findFirst({ where: { accountId, email: data.email } });
      if (existing) {
        // update existing
        return prisma.lead.update({ where: { id: existing.id }, data: { ...data, updatedAt: new Date() } });
      }
    }
    return prisma.lead.create({ data });
  },

  async list(query: any) {
    const accountId = query.accountId || 'default-account';
    const page = parseInt(query.page || '1', 10);
    const take = 20;
    const skip = (page - 1) * take;
    return prisma.lead.findMany({ where: { accountId }, take, skip, orderBy: { createdAt: 'desc' } });
  }
};

export default LeadService;

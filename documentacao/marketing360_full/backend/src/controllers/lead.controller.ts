import { Request, Response } from 'express';
import LeadService from '../services/lead.service';

export class LeadController {
  static async create(req: Request, res: Response) {
    try {
      const payload = req.body;
      const lead = await LeadService.create(payload);
      return res.status(201).json({ success:true, data: lead });
    } catch (err: any) {
      return res.status(500).json({ success:false, error:{ code:'CREATE_ERROR', message: err.message } });
    }
  }

  static async list(req: Request, res: Response) {
    const leads = await LeadService.list(req.query);
    return res.json({ success:true, data: leads });
  }
}

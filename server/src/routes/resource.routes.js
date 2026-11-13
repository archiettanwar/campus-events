import express from 'express';
import LabResource from '../models/LabResource.js';
import { protect, requireLabAssistant } from '../middleware/auth.middleware.js';

const router = express.Router();

// GET /api/resources
router.get('/', async (req, res, next) => {
  try {
    const { type, search } = req.query;
    const filter = { isActive: true };

    if (type && ['lab_room', 'equipment'].includes(type)) {
      filter.resourceType = type;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }

    const resources = await LabResource.find(filter).sort({ resourceType: 1, name: 1 });
    res.json({ resources });
  } catch (err) {
    next(err);
  }
});

// POST /api/resources (Lab Assistant)
router.post('/', protect, requireLabAssistant, async (req, res, next) => {
  try {
    const { name, resourceType, category, description, location, totalQuantity, specifications } = req.body;
    const qty = Number(totalQuantity) || 1;

    const resource = await LabResource.create({
      name,
      resourceType,
      category,
      description,
      location,
      totalQuantity: qty,
      availableQuantity: qty,
      specifications: specifications || '',
    });

    req.app.get('io')?.emit('resource:updated', resource);
    res.status(201).json({ resource });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/resources/:id (Lab Assistant)
router.patch('/:id', protect, requireLabAssistant, async (req, res, next) => {
  try {
    const resource = await LabResource.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!resource) return res.status(404).json({ message: 'Resource not found' });

    req.app.get('io')?.emit('resource:updated', resource);
    res.json({ resource });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/resources/:id (Lab Assistant)
router.delete('/:id', protect, requireLabAssistant, async (req, res, next) => {
  try {
    const resource = await LabResource.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!resource) return res.status(404).json({ message: 'Resource not found' });

    req.app.get('io')?.emit('resource:updated', resource);
    res.json({ message: 'Resource removed' });
  } catch (err) {
    next(err);
  }
});

export default router;
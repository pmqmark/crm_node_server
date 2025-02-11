import express, { Request, Response, NextFunction, Router } from 'express';
const router: Router = express.Router();

/* GET home page. */
router.get('/', function(req: Request, res: Response, next: NextFunction) {
  res.render('index', { title: 'Express with TypeScript' });
});

export default router;
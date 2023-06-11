import { Request, Response, Router } from "express";
import Usage from "./models/Usage";
import Device from "./models/Device";
import axios from "axios";

const router: Router = Router();

router.post('/usage', async (req: Request, res: Response) => {
    const start = req.body.start;
    const end = req.body.end;

    const startDate = new Date(start);
    const endDate = new Date(end);

    const response = await axios.get(
        `https://dashboard.elering.ee/api/nps/price?start=${start.split(":")[0]}:00:00.000Z&end=${end}:00.000Z`
    );

    let totalCost = 0;
    const prices = response.data.data.ee.slice();

    if (prices.length === 1) {
        const cost = prices[0].price * (endDate.getMinutes() - startDate.getMinutes()) / 60;
        totalCost += cost;
    }

    if (prices.length > 1) {
        const costFirstHour = prices[0].price * (60 - startDate.getMinutes()) / 60;
        totalCost += costFirstHour;
        const costLastHour = prices[prices.length - 1].price * endDate.getMinutes() / 60;
        totalCost += costLastHour;
    }

    if (prices.length > 2) {
        prices.splice(0, 1);
        prices.splice(prices.length - 1);
        prices.forEach((element: any) => totalCost += element.price);
    }

    try {
        const device = await Device.findById(req.body.device);
        if (device) {
            const totalUsageCost = totalCost / 1000000 * device?.consumption;

            const data = new Usage({
                device: req.body.device,
                customer: req.body.customer,
                startDate: req.body.start,
                endDate: req.body.end,
                totalUsageCost: totalUsageCost
            });

            const savedData = await data.save();
            res.status(200).json(savedData);
        }
    } catch (error) {
        res.status(500).json({ message: error });
    }
});

export default router;

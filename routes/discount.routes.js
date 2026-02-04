const express = require('express');
const router = express.Router();
const DiscountController = require('../controllers/discountController');
const authenticateToken = require('../middleware/authMiddleware');

/**
 * @swagger
 * /api/discounts/validate:
 *   post:
 *     summary: Validate a discount code
 *     tags: [Discounts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 example: SAVE10
 *               programId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Discount validation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                 discount:
 *                   $ref: '#/components/schemas/Discount'
 *       400:
 *         description: Invalid or expired code
 */
router.post('/validate', DiscountController.validate);

/**
 * @swagger
 * /api/discounts/public:
 *   get:
 *     summary: Get public discount codes
 *     tags: [Discounts]
 *     responses:
 *       200:
 *         description: List of public discounts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 discounts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Discount'
 */
router.get('/public', DiscountController.getPublicCodes);

/**
 * @swagger
 * /api/discounts/my:
 *   get:
 *     summary: Get current user's available discounts
 *     tags: [Discounts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's available discounts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 discounts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Discount'
 *       401:
 *         description: Unauthorized
 */
router.get('/my', authenticateToken, DiscountController.getMyDiscounts);

/**
 * @swagger
 * /api/discounts:
 *   get:
 *     summary: Get all discounts (Admin only)
 *     tags: [Discounts, Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all discounts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 discounts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Discount'
 *       403:
 *         description: Admin access required
 */
router.get('/', authenticateToken, DiscountController.getAll);

/**
 * @swagger
 * /api/discounts:
 *   post:
 *     summary: Create a new discount code (Admin only)
 *     tags: [Discounts, Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - discountType
 *               - discountValue
 *             properties:
 *               code:
 *                 type: string
 *                 example: SUMMER2024
 *               discountType:
 *                 type: string
 *                 enum: [percentage, fixed]
 *                 example: percentage
 *               discountValue:
 *                 type: number
 *                 example: 20
 *               expiryDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-12-31"
 *               usageLimit:
 *                 type: integer
 *                 example: 100
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Discount created
 *       403:
 *         description: Admin access required
 */
router.post('/', authenticateToken, DiscountController.create);

/**
 * @swagger
 * /api/discounts/email:
 *   post:
 *     summary: Email discount code to users (Admin only)
 *     tags: [Discounts, Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               discountId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Emails sent successfully
 *       403:
 *         description: Admin access required
 */
router.post('/email', authenticateToken, DiscountController.emailToUsers);

/**
 * @swagger
 * /api/discounts/{id}:
 *   delete:
 *     summary: Delete a discount code (Admin only)
 *     tags: [Discounts, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Discount ID
 *     responses:
 *       200:
 *         description: Discount deleted
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Discount not found
 */
router.delete('/:id', authenticateToken, DiscountController.delete);

module.exports = router;

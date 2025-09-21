const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const { protect } = require("../middleware/authMiddleware");

router.get("/", productController.getAllProducts);
router.get("/user", protect, productController.getUserProducts);
router.post("/", protect, productController.createProduct);
router.put("/:id", protect, productController.updateProduct);
router.delete("/:id", protect, productController.deleteProduct);
router.patch("/:id/sold", protect, productController.markAsSold);
router.patch("/:id/save", protect, productController.toggleSaveProduct);
router.patch("/:id/like", protect, productController.toggleLikeProduct);

module.exports = router;

const Product = require("../models/Product");
const User = require("../models/User");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();
const formidable = require("formidable");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate("seller", "name email")
      .populate("likes")
      .populate("savedBy");
    res.status(200).json(products);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch products", error: err.message });
  }
};

exports.getUserProducts = async (req, res) => {
  try {
    const products = await Product.find({ seller: req.user.id });
    res.status(200).json(products);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch user products", error: err.message });
  }
};

exports.createProduct = async (req, res) => {
  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: "Error parsing form data" });
    }

    const { title, description, price, category, hostelBlock, hostelType } =
      fields;
    const image = files.image ? files.image[0] : null;

    if (!title || !description || !price || !category) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const imagePath = image?.filepath || null;

    let imageUrl = null;
    if (image) {
      try {
        const result = await cloudinary.uploader.upload(imagePath, {
          folder: "products",
        });
        imageUrl = result.secure_url;
      } catch (error) {
        console.error("Error uploading to Cloudinary:", error);
        return res.status(500).json({ error: "Image upload failed" });
      }
    }

    const newProduct = new Product({
      title: title[0],
      description: description[0],
      price: price[0],
      category: category[0],
      hostelBlock: hostelBlock[0],
      hostelType: hostelType[0],
      seller: req.user.id,
      sellerName: req.user.name,
      sellerMobile: req.user.mobileNumber,
      imageUrl,
    });

    await newProduct.save();

    res
      .status(201)
      .json({ message: "Product created successfully", product: newProduct });
  });
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product || product.seller.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Unauthorized to update this product" });
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    res.status(200).json(updatedProduct);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to update product", error: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product || product.seller.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Unauthorized to delete this product" });
    }

    await Product.findByIdAndDelete(id);
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to delete product", error: err.message });
  }
};

exports.markAsSold = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product || product.seller.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Unauthorized to delete this product" });
    }

    await Product.findByIdAndDelete(id);
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to delete product", error: err.message });
  }
};

exports.toggleSaveProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) return res.status(404).json({ message: "Product not found" });

    const user = req.user;
    const isSaved = product.savedBy.includes(user.id);

    if (isSaved) {
      product.savedBy = product.savedBy.filter(
        (userId) => userId.toString() !== user.id
      );
    } else {
      product.savedBy.push(user.id);
    }

    await product.save();
    res.status(200).json(product);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to toggle save product", error: err.message });
  }
};

exports.toggleLikeProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) return res.status(404).json({ message: "Product not found" });

    const user = req.user;
    const isLiked = product.likes.includes(user.id);

    if (isLiked) {
      product.likes = product.likes.filter(
        (userId) => userId.toString() !== user.id
      );
    } else {
      product.likes.push(user.id);
    }

    await product.save();
    res.status(200).json(product);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to toggle like product", error: err.message });
  }
};

import {NextFunction, Request, Response} from "express";
import { T } from "../libs/types/common";
import MemberService from "../models/Member.service";
import { AdminRequest, LoginInput, MemberInput } from "../libs/types/member";
import { MemberType } from "../libs/enums/member.enum";
import Errors, { HttpCode, Message } from "../libs/Errors";
import ProductService from "../models/Product.service";

const memberService = new MemberService();
const productService = new ProductService();

const storeController: T = {};
storeController.goHome = (req: Request, res: Response) => {
  try {
    console.log('goHome');
    res.render("home");
    // send | json | redirect | end | render
  } catch (err) {
    console.log("Error, goHome:", err);
    res.redirect("/admin");

  }
};


storeController.getSignup = (req: Request, res: Response) => {
  try {
    console.log('getSignup');
    res.render("signup");
  } catch (err) {
    console.log("Error, getSignup:", err);
    res.redirect("/admin");

  }
};


storeController.getLogin = (req: Request, res: Response) => {
  try {
    console.log('getLogin');
    res.render("login");
  } catch (err) {
    console.log("Error, getLogin:", err);
    res.redirect("/admin");
  }
};


storeController.processSignup = async (req: AdminRequest, res: Response) => {
  try {
    console.log('processSignup');
    // console.log("body:", req.body);
    // res.send("DONE");
    const file = req.file;
    if (!file) throw new Errors(HttpCode.BAD_REQUEST, Message.SOMETHING_WENT_WRONG);

    const newMember: MemberInput = req.body;
    newMember.memberImage = file?.path;
    newMember.memberType = MemberType.STORE;
    const result = await memberService.processSignup(newMember);
    

    req.session.member = result;
    req.session.save(function () {
      res.redirect("/admin/product/all");
    });

  } catch (err) {
    console.log("Error, processSignup:", err);
    const message =
      err instanceof Errors ? err.message : Message.SOMETHING_WENT_WRONG;
    res.send(`<script> alert("${message}"); window.location.replace("/admin/signup")</script>`);

  }
};


storeController.processLogin = async (req: AdminRequest, res: Response) => {
  try {
    console.log('processLogin');

    console.log("body:", req.body);
    const input: LoginInput = req.body;
    const result = await memberService.processLogin(input);
    

    req.session.member = result;
    req.session.save(function () {
      res.redirect("/admin/product/all");
    });

  } catch (err) {
    console.log("Error, processLogin:", err);

    const message =
      err instanceof Errors ? err.message : Message.SOMETHING_WENT_WRONG;
    res.send(`<script> alert("${message}"); window.location.replace("/admin/login")</script>`);
  }
};

storeController.logout = async (req: AdminRequest, res: Response) => {
  try {
    console.log('logout');
    req.session.destroy(function () {
      res.redirect("/admin");
    })
  } catch (err) {
    console.log("Error, logout:", err);
    res.redirect("/admin");
  }
};

storeController.getUsers = async (req: AdminRequest, res: Response) => {
  try {
    console.log('getUsers');
    const { users, total, activeCount, blockedCount, deletedCount } =
      await memberService.getAllUsers();   // ← eski memberService.getUsers() o'rniga

    res.render("users", {
      member: req.session?.member ?? null,   // ← endi member ham uzatiladi
      users,
      total,
      activeCount,
      blockedCount,
      deletedCount,
    });
  } catch (err) {
    console.log("Error, getUsers:", err);
    res.redirect("/admin/login");
  }
};

storeController.getAllProducts = async (req: AdminRequest, res: Response) => {
  try {
    console.log('getAllItems');
    const { products, total, activeCount, pausedCount, deletedCount, lowStockCount } =
      await productService.getAllProducts();
 
    res.render("products", {
      member: req.session?.member ?? null,
      products,
      total,
      activeCount,
      pausedCount,
      deletedCount,
      lowStockCount,
    });
  } catch (err) {
    console.log("Error, getAllProducts:", err);
    res.redirect("/admin/login");
  }
};

storeController.updateChosenUser = async (req: Request, res: Response) => {
  try {
    console.log('updateChosenUser');
    const result = await memberService.updateChosenUser(req.body);

    res.status(HttpCode.OK).json({ data: result });
  } catch (err) {
    console.log("Error, updateChosenUser:", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

storeController.checkAuthSession = async (req: AdminRequest, res: Response) => {
  try {
    console.log('checkAuthSession');
    if (req.session?.member)
      res.send(`<script> alert("${req.session.member.memberNick}") </script>`);
      
    else res.send(`<script> alert("${Message.NOT_AUTHENTICATED}") </script>`);
  } catch (err) {
    console.log("Error, checkAuthSession:", err);
    res.send(err);
  }
};

storeController.verifyStore = (
  req: AdminRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.session?.member?.memberType === MemberType.STORE) {
    req.member = req.session.member;
    next();
  } else {
    const message = Message.NOT_AUTHENTICATED;
    res.send(
      `<script> alert("${message}"); window.location.replace('/admin/login'); </script>`
    );
  }
};

export default storeController;
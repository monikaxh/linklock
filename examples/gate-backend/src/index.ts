import passport from "passport";
import express, { Response } from "express";
import { MembershipStrategy } from "@membership/passport";
import { buildAuthHandlerUrl } from "@membership/passport/src/utils";

const app = express();
const port = 3004;

app.use(require("cookie-parser")());
app.use(require("body-parser").json());
app.use(
  require("express-session")({
    secret: "keyboard cat",
    resave: true,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());

const membershipDefinitionId = "0";
const adminAddress = "0xde4a0b425de4053e";
const callbackUrl = `http://localhost:3004/callback`;

const membershipStrategy = new MembershipStrategy({
  network: "testnet",
  membershipDefinitionId,
  adminAddress,
});

passport.use(membershipStrategy);

app.get("/", (req, res) => {
  sendHtml(res, "Home page. <a href='/login'>Login</a>");
});

app.get("/login", (req, res) => {
  res.redirect(
    buildAuthHandlerUrl({
      adminAddress,
      membershipDefinitionId,
      callbackUrl,
    })
  );
});

app.get(
  "/callback",
  passport.authenticate(membershipStrategy.name, { failureRedirect: "/login" }),
  function (req, res) {
    // TODO: Can we make another protected endpoint, but not force users to re-authenticate?
    sendHtml(
      res,
      `<h1>Hello Member</h1>
       <pre>${JSON.stringify((res as any).user, null, 4)}</pre>
      `
    );
  }
);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

function sendHtml(res: Response, html) {
  res.set("Content-Type", "text/html");
  res.send(Buffer.from(html));
}

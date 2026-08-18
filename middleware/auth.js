const jwt = require("jsonwebtoken");

const JWT_SECRET =
  String(
    process.env.JWT_SECRET || ""
  ).trim();


/*
========================================
NOSMYBOOST🇧🇪
AUTHENTIFICATION JWT
========================================
*/

function authenticateToken(
  req,
  res,
  next
) {

  /*
  ======================================
  VÉRIFIER SECRET
  ======================================
  */

  if (!JWT_SECRET) {

    console.error(
      "JWT_SECRET manque dans .env"
    );

    return res.status(500).json({

      success: false,

      message:
        "Configuration serveur incomplète."

    });

  }


  /*
  ======================================
  RÉCUPÉRER AUTHORIZATION
  ======================================
  */

  const authorization =
    req.headers.authorization || "";


  if (
    !authorization.startsWith(
      "Bearer "
    )
  ) {

    return res.status(401).json({

      success: false,

      message:
        "Authentification requise."

    });

  }


  const token =
    authorization
      .slice(7)
      .trim();


  if (!token) {

    return res.status(401).json({

      success: false,

      message:
        "Token manquant."

    });

  }


  /*
  ======================================
  VÉRIFIER TOKEN
  ======================================
  */

  try {

    const decoded =
      jwt.verify(
        token,
        JWT_SECRET
      );


    /*
    ====================================
    UTILISATEUR DISPONIBLE DANS req.user
    ====================================
    */

    req.user = decoded;


    next();


  } catch (error) {

    console.error(
      "JWT invalide:",
      error.message
    );


    return res.status(401).json({

      success: false,

      message:
        "Session expirée ou token invalide."

    });

  }

}


module.exports =
  authenticateToken;

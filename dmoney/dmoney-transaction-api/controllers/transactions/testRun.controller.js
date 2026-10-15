const { Transactions } = require("../../sequelizeModel/Transactions");

exports.cleanupK6Run = async (req, res) => {
  if (req.user.role !== "Agent") {
    return res
      .status(403)
      .json({ message: "Only an Agent can clean up a k6 run." });
  }

  const { runId } = req.params;
  if (!/^k6-[a-zA-Z0-9-]{1,100}$/.test(runId)) {
    return res.status(400).json({ message: "Invalid k6 run ID." });
  }

  try {
    const deleted = await Transactions.destroy({
      where: { test_run_id: runId },
    });
    return res
      .status(200)
      .json({ message: "k6 run data cleaned up.", deleted });
  } catch (error) {
    console.error("k6 run cleanup error:", error);
    return res.status(500).json({ message: "Unable to clean up k6 run data." });
  }
};

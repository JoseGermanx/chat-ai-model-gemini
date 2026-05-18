import PropTypes from "prop-types";
import { getAgent } from "../../config/agents";

const TutorBadge = ({ agentId, showName = false }) => {
  const agent = getAgent(agentId);

  return (
    <span
      className="tutor-badge"
      title={agent.name}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        fontSize: "0.75rem",
        lineHeight: 1,
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: agent.color,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.65rem",
          flexShrink: 0,
        }}
      >
        {agent.icon}
      </span>
      {showName && (
        <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
          {agent.name}
        </span>
      )}
    </span>
  );
};

TutorBadge.propTypes = {
  agentId: PropTypes.string,
  showName: PropTypes.bool,
};

export default TutorBadge;

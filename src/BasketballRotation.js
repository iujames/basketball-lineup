import React, { useState } from "react";
import { toPng } from "html-to-image";

const BasketballRotation = () => {
  const defaultPlayers = [
    { name: "Josh", position: "G", prioritize: false },
    { name: "Ethan", position: "G", prioritize: false },
    { name: "Owen", position: "G", prioritize: false },
    { name: "Jayden", position: "G", prioritize: false },
    { name: "Easton", position: "G", prioritize: false },
    { name: "Grayson", position: "F", prioritize: false },
    { name: "Leighton", position: "F", prioritize: false },
    { name: "Andrew", position: "F", prioritize: false },
    { name: "Nolan", position: "F", prioritize: false },
  ];

  const [players, setPlayers] = useState(defaultPlayers);
  const [starters, setStarters] = useState([
    "Josh",
    "Ethan",
    "Owen",
    "Grayson",
    "Leighton",
  ]);
  const [closers, setClosers] = useState([
    "Ethan",
    "Owen",
    "Andrew",
    "Grayson",
    "Leighton",
  ]);
  const [inexperienced, setInexperienced] = useState([
    "Jayden",
    "Easton",
    "Nolan",
  ]);
  const [solution, setSolution] = useState(null);
  const [error, setError] = useState(null);
  const [showValidation, setShowValidation] = useState(false);

  const solvePuzzle = () => {
    // Try up to 50 times to find a valid solution
    for (let attempt = 0; attempt < 50; attempt++) {
      try {
        const periods = 8;

        // Initialize rotation grid
        const rotation = Array(players.length)
          .fill(0)
          .map(() => Array(periods).fill(0));

        // Set starters (period 0) if specified
        starters.forEach((name) => {
          const idx = players.findIndex((p) => p.name === name);
          if (idx !== -1) rotation[idx][0] = 1;
        });

        // Set closers (period 7) if specified
        closers.forEach((name) => {
          const idx = players.findIndex((p) => p.name === name);
          if (idx !== -1) rotation[idx][7] = 1;
        });

        // Helper function to check if inexperienced constraint is violated
        const checkInexperienced = (period) => {
          const onCourt = [];
          rotation.forEach((player, idx) => {
            if (player[period] === 1) onCourt.push(players[idx].name);
          });
          const inexpCount = inexperienced.filter((name) =>
            onCourt.includes(name)
          ).length;
          // Don't allow ALL inexperienced players on court at once
          // (must have at least one experienced player)
          return inexpCount < inexperienced.length && inexpCount < 5;
        };

        // Helper function to count players in a period
        const countInPeriod = (period) => {
          return rotation.reduce((sum, player) => sum + player[period], 0);
        };

        // Helper function to get playing time
        const getPlayTime = (playerIdx) => {
          return rotation[playerIdx].reduce((sum, val) => sum + val, 0) * 5;
        };

        // Helper function to get playing time in a half
        const getHalfPlayTime = (playerIdx, half) => {
          const start = half === 1 ? 0 : 4;
          const end = half === 1 ? 4 : 8;
          return (
            rotation[playerIdx]
              .slice(start, end)
              .reduce((sum, val) => sum + val, 0) * 5
          );
        };

        // Helper to check max consecutive
        const getMaxConsecutive = (playerIdx) => {
          let max = 0;
          let current = 0;
          for (let p = 0; p < periods; p++) {
            if (rotation[playerIdx][p] === 1) {
              current++;
              max = Math.max(max, current);
            } else {
              current = 0;
            }
          }
          return max * 5;
        };

        // Helper to count position in period
        const countPositionInPeriod = (period, position) => {
          let count = 0;
          rotation.forEach((player, idx) => {
            if (player[period] === 1 && players[idx].position === position) {
              count++;
            }
          });
          return count;
        };

        // Greedy assignment for all periods (fill in gaps for starters/closers too)
        for (let period = 0; period < 8; period++) {
          // Skip if already at 5 players
          if (countInPeriod(period) === 5) continue;

          while (countInPeriod(period) < 5) {
            const currentGuards = countPositionInPeriod(period, "G");
            const currentForwards = countPositionInPeriod(period, "F");

            // Determine which position we need more
            let preferredPosition = null;
            if (currentForwards < 2 && countInPeriod(period) >= 3) {
              preferredPosition = "F"; // Need at least 2 forwards
            } else if (currentGuards < 2 && countInPeriod(period) >= 3) {
              preferredPosition = "G"; // Need at least 2 guards
            }

            // Get candidates (players not yet assigned this period)
            let candidates = players
              .map((p, idx) => ({
                idx,
                name: p.name,
                position: p.position,
                prioritize: p.prioritize,
                playTime: getPlayTime(idx),
                half1: getHalfPlayTime(idx, 1),
                half2: getHalfPlayTime(idx, 2),
                maxConsec: getMaxConsecutive(idx),
                inPrevious: period > 0 ? rotation[idx][period - 1] : 0,
              }))
              .filter((p) => rotation[p.idx][period] === 0);

            // Filter by preferred position if needed
            if (preferredPosition) {
              const positionCandidates = candidates.filter(
                (c) => c.position === preferredPosition
              );
              if (positionCandidates.length > 0) {
                candidates = positionCandidates;
              }
            }

            // Sort by priority: give prioritized players more time, but keep balance
            candidates.sort((a, b) => {
              const halfA = period < 4 ? a.half1 : a.half2;
              const halfB = period < 4 ? b.half1 : b.half2;

              // Calculate effective play time (prioritized players get -5 min boost)
              const effectiveTimeA = a.playTime - (a.prioritize ? 5 : 0);
              const effectiveTimeB = b.playTime - (b.prioritize ? 5 : 0);

              // First priority: players with less effective playing time
              if (effectiveTimeA !== effectiveTimeB)
                return effectiveTimeA - effectiveTimeB;

              // Second priority: balance within the current half
              if (halfA !== halfB) return halfA - halfB;

              // Third priority: prefer players who just rested
              if (a.inPrevious !== b.inPrevious)
                return a.inPrevious - b.inPrevious;

              // Add randomization for variety in solutions
              return Math.random() - 0.5;
            });

            // Try to assign the best candidate
            let assigned = false;
            for (const candidate of candidates) {
              rotation[candidate.idx][period] = 1;

              // Check inexperienced constraint
              if (!checkInexperienced(period)) {
                rotation[candidate.idx][period] = 0;
                continue;
              }

              assigned = true;
              break;
            }

            // Safety check to avoid infinite loop
            if (!assigned) {
              console.error("Could not assign player for period", period);
              break;
            }
          }
        }

        // Validate solution
        const validation = players.map((p, idx) => ({
          name: p.name,
          total: getPlayTime(idx),
          half1: getHalfPlayTime(idx, 1),
          half2: getHalfPlayTime(idx, 2),
          maxConsec: getMaxConsecutive(idx),
        }));

        // Check if solution is balanced and valid
        const playTimes = validation.map((v) => v.total);
        const minPlayTime = Math.min(...playTimes);
        const maxPlayTime = Math.max(...playTimes);
        const timeSpread = maxPlayTime - minPlayTime;

        // All periods must have exactly 5 players
        const allPeriodsValid = Array.from({ length: periods }).every(
          (_, periodIdx) =>
            rotation.reduce((sum, player) => sum + player[periodIdx], 0) === 5
        );

        // Each half should have some balance (within 10 min per player)
        const halfBalanced = validation.every(
          (v) => Math.abs(v.half1 - v.half2) <= 10
        );

        // No player should play more than 15 consecutive minutes
        const consecValid = validation.every((v) => v.maxConsec <= 15);

        // Time spread should be reasonable (within 5 minutes for balanced play)
        // Prioritized players may get one extra period (5 min) max
        const balanceValid = timeSpread <= 5;

        if (allPeriodsValid && halfBalanced && consecValid && balanceValid) {
          // Found a valid solution!
          setSolution({ rotation, players, validation });
          setError(null);
          return; // Exit the retry loop
        }

        // If not valid, try again (continue loop)
        if (attempt === 49) {
          // Last attempt failed
          throw new Error(
            "Could not find a valid rotation after 50 attempts. Try adjusting your constraints (starters, closers, positions, inexperienced players)."
          );
        }
      } catch (err) {
        if (attempt === 49) {
          // Last attempt and got an error
          setError(err.message);
          setSolution(null);
          return;
        }
        // Otherwise continue trying
      }
    }
  };

  const updatePlayer = (index, field, value) => {
    const newPlayers = [...players];
    newPlayers[index][field] = value;
    setPlayers(newPlayers);
  };

  const togglePrioritize = (index) => {
    const newPlayers = [...players];
    newPlayers[index].prioritize = !newPlayers[index].prioritize;
    setPlayers(newPlayers);
  };

  const toggleStarter = (playerName) => {
    if (starters.includes(playerName)) {
      setStarters(starters.filter((name) => name !== playerName));
    } else {
      if (starters.length < 5) {
        setStarters([...starters, playerName]);
      } else {
        alert("You can only have 5 starters");
      }
    }
  };

  const toggleCloser = (playerName) => {
    if (closers.includes(playerName)) {
      setClosers(closers.filter((name) => name !== playerName));
    } else {
      if (closers.length < 5) {
        setClosers([...closers, playerName]);
      } else {
        alert("You can only have 5 closers");
      }
    }
  };

  const toggleInexperienced = (playerName) => {
    if (inexperienced.includes(playerName)) {
      setInexperienced(inexperienced.filter((name) => name !== playerName));
    } else {
      setInexperienced([...inexperienced, playerName]);
    }
  };

  const removePlayer = (index) => {
    const playerName = players[index].name;
    setPlayers(players.filter((_, i) => i !== index));
    setStarters(starters.filter((name) => name !== playerName));
    setClosers(closers.filter((name) => name !== playerName));
    setInexperienced(inexperienced.filter((name) => name !== playerName));
  };

  const periods = [
    "Start",
    "15:00",
    "10:00",
    "5:00",
    "2nd Half",
    "15:00",
    "10:00",
    "5:00",
  ];

  const downloadAsImage = async () => {
    try {
      // Find the export content wrapper (excludes header and export button)
      const container = document.querySelector(".export-content");

      if (!container) {
        alert("Could not find lineup to copy");
        return;
      }

      // Generate image with padding applied only to the export
      const dataUrl = await toPng(container, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
        cacheBust: true,
        width: container.offsetWidth + 32, // Add padding width
        height: container.offsetHeight + 32, // Add padding height
        style: {
          padding: "1rem",
        },
      });

      // Copy to clipboard
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      alert("✓ Copied to clipboard!");
    } catch (error) {
      console.error("Error copying image:", error);
      alert("Error copying image: " + error.message);
    }
  };

  return (
    <div style={{ padding: "0.75rem", maxWidth: "1400px", margin: "0 auto" }}>
      <h1
        style={{
          fontSize: "1.75rem",
          fontWeight: "bold",
          marginBottom: "1rem",
        }}
      >
        Basketball Lineup Generator
      </h1>

      {/* Player Configuration Section */}
      <div
        className="no-print"
        style={{
          marginBottom: "1rem",
          backgroundColor: "white",
          padding: "0.75rem",
          borderRadius: "0.5rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          {players.map((player, index) => (
            <div
              key={index}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "0.375rem",
                padding: "0.5rem",
                backgroundColor: "white",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "0.375rem",
                  marginBottom: "0.5rem",
                  alignItems: "center",
                }}
              >
                <input
                  type="text"
                  value={player.name}
                  onChange={(e) => updatePlayer(index, "name", e.target.value)}
                  style={{
                    flex: 1,
                    padding: "0.375rem 0.5rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.25rem",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                  }}
                  placeholder="Player name"
                />
                <select
                  value={player.position}
                  onChange={(e) =>
                    updatePlayer(index, "position", e.target.value)
                  }
                  style={{
                    padding: "0.375rem 0.5rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "0.25rem",
                    fontSize: "0.875rem",
                  }}
                >
                  <option value="G">G</option>
                  <option value="F">F</option>
                </select>
                <button
                  onClick={() => removePlayer(index)}
                  style={{
                    padding: "0.375rem 0.5rem",
                    backgroundColor: "#fee2e2",
                    color: "#991b1b",
                    border: "none",
                    borderRadius: "0.25rem",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                  }}
                >
                  ✕
                </button>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "0.375rem",
                }}
              >
                <button
                  onClick={() => toggleStarter(player.name)}
                  style={{
                    padding: "0.5rem 0.5rem",
                    fontSize: "0.75rem",
                    border: "1px solid",
                    borderRadius: "9999px",
                    cursor: "pointer",
                    borderColor: starters.includes(player.name)
                      ? "#10b981"
                      : "#d1d5db",
                    backgroundColor: starters.includes(player.name)
                      ? "#d1fae5"
                      : "white",
                    color: starters.includes(player.name)
                      ? "#065f46"
                      : "#6b7280",
                    fontWeight: starters.includes(player.name)
                      ? "600"
                      : "normal",
                  }}
                >
                  Start
                </button>
                <button
                  onClick={() => toggleCloser(player.name)}
                  style={{
                    padding: "0.5rem 0.5rem",
                    fontSize: "0.75rem",
                    border: "1px solid",
                    borderRadius: "9999px",
                    cursor: "pointer",
                    borderColor: closers.includes(player.name)
                      ? "#3b82f6"
                      : "#d1d5db",
                    backgroundColor: closers.includes(player.name)
                      ? "#dbeafe"
                      : "white",
                    color: closers.includes(player.name)
                      ? "#1e40af"
                      : "#6b7280",
                    fontWeight: closers.includes(player.name)
                      ? "600"
                      : "normal",
                  }}
                >
                  Finish
                </button>
                <button
                  onClick={() => togglePrioritize(index)}
                  style={{
                    padding: "0.5rem 0.5rem",
                    fontSize: "0.75rem",
                    border: "1px solid",
                    borderRadius: "9999px",
                    cursor: "pointer",
                    borderColor: player.prioritize ? "#f59e0b" : "#d1d5db",
                    backgroundColor: player.prioritize ? "#fef3c7" : "white",
                    color: player.prioritize ? "#92400e" : "#6b7280",
                    fontWeight: player.prioritize ? "600" : "normal",
                  }}
                >
                  Bonus
                </button>
                <button
                  onClick={() => toggleInexperienced(player.name)}
                  style={{
                    padding: "0.5rem 0.5rem",
                    fontSize: "0.75rem",
                    border: "1px solid",
                    borderRadius: "9999px",
                    cursor: "pointer",
                    borderColor: inexperienced.includes(player.name)
                      ? "#8b5cf6"
                      : "#d1d5db",
                    backgroundColor: inexperienced.includes(player.name)
                      ? "#ede9fe"
                      : "white",
                    color: inexperienced.includes(player.name)
                      ? "#5b21b6"
                      : "#6b7280",
                    fontWeight: inexperienced.includes(player.name)
                      ? "600"
                      : "normal",
                  }}
                >
                  Rookie
                </button>
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: "1rem",
          }}
        >
          <button
            onClick={solvePuzzle}
            style={{
              width: "100%",
              padding: "0.5rem 1.5rem",
              backgroundColor: "#2563eb",
              color: "white",
              border: "1px solid #2563eb",
              borderRadius: "9999px",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: "pointer",
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = "#1d4ed8")}
            onMouseOut={(e) => (e.target.style.backgroundColor = "#2563eb")}
          >
            🏀 Generate
          </button>

          <div
            style={{
              fontSize: "0.75rem",
              color: "#9ca3af",
              textAlign: "center",
              marginTop: "0.5rem",
            }}
          >
            Start: {starters.length}/5 | Finish: {closers.length}/5
          </div>
        </div>

        <div
          style={{
            marginTop: "0.75rem",
            padding: "0.75rem",
            backgroundColor: "#f9fafb",
            borderRadius: "0.375rem",
            fontSize: "0.8125rem",
            color: "#6b7280",
            lineHeight: "1.5",
          }}
        >
          <div style={{ marginBottom: "0.5rem" }}>
            <strong style={{ color: "#374151" }}>How it works:</strong> The
            algorithm balances playing time evenly across all players (within 5
            minutes).
          </div>
          <div style={{ marginBottom: "0.5rem" }}>
            <strong>Bonus:</strong> When choosing between equally-rested
            players, those marked "Bonus" get the edge for additional playing
            time.
          </div>
          <div style={{ marginBottom: "0.5rem" }}>
            <strong>Rookie:</strong> Prevents all rookie players from being on
            court at the same time (ensures at least one experienced player).
          </div>
          <div>
            <em>Tip: Click multiple times for different valid rotations.</em>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "1rem",
            backgroundColor: "#fee2e2",
            border: "1px solid #ef4444",
            borderRadius: "0.375rem",
            color: "#dc2626",
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Solution Display */}
      {!solution && !error && (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            color: "#6b7280",
            fontSize: "1.125rem",
          }}
        >
          Configure your players above and click "Generate Rotation" to see the
          schedule
        </div>
      )}

      {solution && (
        <>
          <div
            className="rotation-schedule-container"
            style={{ overflowX: "auto", marginBottom: "1.5rem" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "0.75rem",
              }}
            >
              <h2
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                  margin: 0,
                }}
              >
                Lineup
              </h2>
              <button
                onClick={downloadAsImage}
                style={{
                  padding: "0.375rem 0.75rem",
                  fontSize: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "9999px",
                  cursor: "pointer",
                  backgroundColor: "white",
                  color: "#6b7280",
                  fontWeight: "normal",
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = "#f9fafb";
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = "white";
                }}
              >
                copy
              </button>
            </div>

            {/* Wrapper for image export - excludes header */}
            <div className="export-content">
              <table
                style={{
                  borderCollapse: "collapse",
                  width: "100%",
                  border: "1px solid #d1d5db",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#f3f4f6" }}>
                    <th
                      style={{
                        border: "1px solid #d1d5db",
                        padding: "0.5rem 1rem",
                      }}
                    >
                      Player
                    </th>
                    {periods.map((p, idx) => (
                      <th
                        key={idx}
                        style={{
                          border: "1px solid #d1d5db",
                          padding: "0.5rem 1rem",
                        }}
                      >
                        {p}
                      </th>
                    ))}
                    <th
                      style={{
                        border: "1px solid #d1d5db",
                        padding: "0.5rem 1rem",
                      }}
                    >
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {solution.players.map((player, pIdx) => (
                    <tr key={pIdx}>
                      <td
                        style={{
                          border: "1px solid #d1d5db",
                          padding: "0.5rem 1rem",
                          fontWeight: "600",
                        }}
                      >
                        {player.name}
                      </td>
                      {solution.rotation[pIdx].map((playing, periodIdx) => (
                        <td
                          key={periodIdx}
                          style={{
                            border: "1px solid #d1d5db",
                            padding: "0.5rem 1rem",
                            textAlign: "center",
                          }}
                        >
                          {playing === 1 ? "🏀" : ""}
                        </td>
                      ))}
                      <td
                        style={{
                          border: "1px solid #d1d5db",
                          padding: "0.5rem 1rem",
                          textAlign: "center",
                          fontWeight: "600",
                        }}
                      >
                        {solution.validation[pIdx].total} min
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Substitution Report - compact, no header */}
              <table
                className="substitution-report-container"
                style={{
                  borderCollapse: "collapse",
                  width: "100%",
                  border: "1px solid #d1d5db",
                  fontSize: "0.875rem",
                  marginTop: "1rem",
                }}
              >
                <tbody>
                  {/* Starting lineup */}
                  <tr>
                    <td
                      style={{
                        border: "1px solid #d1d5db",
                        padding: "0.5rem",
                        fontWeight: "600",
                      }}
                    >
                      Start
                    </td>
                    <td
                      style={{
                        border: "1px solid #d1d5db",
                        padding: "0.5rem",
                      }}
                    >
                      {solution.players
                        .filter((_, pIdx) => solution.rotation[pIdx][0] === 1)
                        .sort((a, b) => {
                          // Sort by position: G first, then F
                          if (a.position === "G" && b.position === "F")
                            return -1;
                          if (a.position === "F" && b.position === "G")
                            return 1;
                          return 0;
                        })
                        .map((p) => p.name)
                        .join(", ")}
                    </td>
                  </tr>

                  {/* Substitutions for each period */}
                  {periods.slice(1).map((period, idx) => {
                    const periodNum = idx + 1;
                    const prevPeriod = periodNum - 1;

                    const prevOnCourt = solution.players.filter(
                      (_, pIdx) => solution.rotation[pIdx][prevPeriod] === 1
                    );
                    const currOnCourt = solution.players.filter(
                      (_, pIdx) => solution.rotation[pIdx][periodNum] === 1
                    );

                    const subsOutPlayers = prevOnCourt.filter(
                      (p) => !currOnCourt.find((c) => c.name === p.name)
                    );
                    const subsInPlayers = currOnCourt.filter(
                      (p) => !prevOnCourt.find((c) => c.name === p.name)
                    );

                    // Match substitutions by position when possible
                    const matchedSubs = [];
                    const unmatchedIn = [...subsInPlayers];
                    const unmatchedOut = [...subsOutPlayers];

                    // First pass: match by position
                    for (let i = unmatchedIn.length - 1; i >= 0; i--) {
                      const playerIn = unmatchedIn[i];
                      const matchingOutIndex = unmatchedOut.findIndex(
                        (p) => p.position === playerIn.position
                      );
                      if (matchingOutIndex !== -1) {
                        matchedSubs.push({
                          in: playerIn.name,
                          out: unmatchedOut[matchingOutIndex].name,
                        });
                        unmatchedIn.splice(i, 1);
                        unmatchedOut.splice(matchingOutIndex, 1);
                      }
                    }

                    // Second pass: match remaining players regardless of position
                    for (let i = 0; i < unmatchedIn.length; i++) {
                      matchedSubs.push({
                        in: unmatchedIn[i].name,
                        out: unmatchedOut[i]?.name || "???",
                      });
                    }

                    return (
                      <tr key={idx}>
                        <td
                          style={{
                            border: "1px solid #d1d5db",
                            padding: "0.5rem",
                            fontWeight: "600",
                          }}
                        >
                          {period}
                        </td>
                        <td
                          style={{
                            border: "1px solid #d1d5db",
                            padding: "0.5rem",
                          }}
                        >
                          {periodNum === 4 ? (
                            <span>
                              {currOnCourt
                                .sort((a, b) => {
                                  // Sort by position: G first, then F
                                  if (a.position === "G" && b.position === "F")
                                    return -1;
                                  if (a.position === "F" && b.position === "G")
                                    return 1;
                                  return 0;
                                })
                                .map((p) => p.name)
                                .join(", ")}
                            </span>
                          ) : matchedSubs.length > 0 ? (
                            matchedSubs.map((sub, i) => (
                              <div key={i}>
                                <span style={{ color: "#15803d" }}>
                                  {sub.in}
                                </span>
                                {" → "}
                                <span style={{ color: "#b91c1c" }}>
                                  {sub.out}
                                </span>
                              </div>
                            ))
                          ) : (
                            <span style={{ color: "#9ca3af" }}>
                              No substitutions
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Finish row - show closing lineup */}
                  <tr>
                    <td
                      style={{
                        border: "1px solid #d1d5db",
                        padding: "0.5rem",
                        fontWeight: "600",
                      }}
                    >
                      Finish
                    </td>
                    <td
                      style={{
                        border: "1px solid #d1d5db",
                        padding: "0.5rem",
                      }}
                    >
                      {solution.players
                        .filter((_, pIdx) => solution.rotation[pIdx][7] === 1)
                        .sort((a, b) => {
                          // Sort by position: G first, then F
                          if (a.position === "G" && b.position === "F")
                            return -1;
                          if (a.position === "F" && b.position === "G")
                            return 1;
                          return 0;
                        })
                        .map((p) => p.name)
                        .join(", ")}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            {/* End export-content wrapper */}
          </div>

          <div
            className="no-print"
            style={{ marginBottom: "1.5rem", marginTop: "2rem" }}
          >
            <div style={{ marginBottom: "0.5rem", textAlign: "center" }}>
              <button
                onClick={() => setShowValidation(!showValidation)}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  color: "#9ca3af",
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  textDecoration: "underline",
                  textDecorationStyle: "dotted",
                }}
                onMouseOver={(e) => {
                  e.target.style.color = "#6b7280";
                }}
                onMouseOut={(e) => {
                  e.target.style.color = "#9ca3af";
                }}
              >
                {showValidation ? "hide" : "show"} validation details
              </button>
            </div>
            {showValidation && (
              <table
                style={{
                  borderCollapse: "collapse",
                  width: "100%",
                  border: "1px solid #d1d5db",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#f3f4f6" }}>
                    <th
                      style={{
                        border: "1px solid #d1d5db",
                        padding: "0.5rem 1rem",
                      }}
                    >
                      Player
                    </th>
                    <th
                      style={{
                        border: "1px solid #d1d5db",
                        padding: "0.5rem 1rem",
                      }}
                    >
                      Total Time
                    </th>
                    <th
                      style={{
                        border: "1px solid #d1d5db",
                        padding: "0.5rem 1rem",
                      }}
                    >
                      1st Half
                    </th>
                    <th
                      style={{
                        border: "1px solid #d1d5db",
                        padding: "0.5rem 1rem",
                      }}
                    >
                      2nd Half
                    </th>
                    <th
                      style={{
                        border: "1px solid #d1d5db",
                        padding: "0.5rem 1rem",
                      }}
                    >
                      Max Run
                    </th>
                    <th
                      style={{
                        border: "1px solid #d1d5db",
                        padding: "0.5rem 1rem",
                      }}
                    >
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {solution.validation.map((v, idx) => {
                    const valid =
                      v.maxConsec <= 15 && Math.abs(v.half1 - v.half2) <= 10;
                    return (
                      <tr
                        key={idx}
                        style={{
                          backgroundColor: valid ? "transparent" : "#fee2e2",
                        }}
                      >
                        <td
                          style={{
                            border: "1px solid #d1d5db",
                            padding: "0.5rem 1rem",
                          }}
                        >
                          {v.name}
                        </td>
                        <td
                          style={{
                            border: "1px solid #d1d5db",
                            padding: "0.5rem 1rem",
                            textAlign: "center",
                          }}
                        >
                          {v.total}
                        </td>
                        <td
                          style={{
                            border: "1px solid #d1d5db",
                            padding: "0.5rem 1rem",
                            textAlign: "center",
                          }}
                        >
                          {v.half1}
                        </td>
                        <td
                          style={{
                            border: "1px solid #d1d5db",
                            padding: "0.5rem 1rem",
                            textAlign: "center",
                          }}
                        >
                          {v.half2}
                        </td>
                        <td
                          style={{
                            border: "1px solid #d1d5db",
                            padding: "0.5rem 1rem",
                            textAlign: "center",
                          }}
                        >
                          {v.maxConsec}
                        </td>
                        <td
                          style={{
                            border: "1px solid #d1d5db",
                            padding: "0.5rem 1rem",
                            textAlign: "center",
                          }}
                        >
                          {valid ? "✓" : "✗"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default BasketballRotation;

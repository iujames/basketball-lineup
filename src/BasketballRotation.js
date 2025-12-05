import React, { useState } from "react";

const BasketballRotation = () => {
  const defaultPlayers = [
    { name: "Josh", position: "G", targetMinutes: 20 },
    { name: "Ethan", position: "G", targetMinutes: 20 },
    { name: "Owen", position: "G", targetMinutes: 20 },
    { name: "Jayden", position: "G", targetMinutes: 20 },
    { name: "Easton", position: "G", targetMinutes: 20 },
    { name: "Grayson", position: "F", targetMinutes: 20 },
    { name: "Leighton", position: "F", targetMinutes: 20 },
    { name: "Andrew", position: "F", targetMinutes: 20 },
    { name: "Nolan", position: "F", targetMinutes: 20 },
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

  const solvePuzzle = () => {
    // Try up to 50 times to find a valid solution
    for (let attempt = 0; attempt < 50; attempt++) {
      try {
        const periods = 8;

        // Initialize rotation grid
        const rotation = Array(players.length)
          .fill(0)
          .map(() => Array(periods).fill(0));

        // Set starters (period 0)
        starters.forEach((name) => {
          const idx = players.findIndex((p) => p.name === name);
          rotation[idx][0] = 1;
        });

        // Set closers (period 7)
        closers.forEach((name) => {
          const idx = players.findIndex((p) => p.name === name);
          rotation[idx][7] = 1;
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
          return inexpCount <= 2;
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

        // Greedy assignment for periods 1-6
        for (let period = 1; period < 7; period++) {
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
                targetMinutes: p.targetMinutes,
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

            // Sort by priority: meet target minutes while keeping balance
            candidates.sort((a, b) => {
              const halfA = period < 4 ? a.half1 : a.half2;
              const halfB = period < 4 ? b.half1 : b.half2;

              // Calculate how far behind target each player is
              const behindA = a.targetMinutes - a.playTime;
              const behindB = b.targetMinutes - b.playTime;

              // First priority: players furthest behind their target
              if (behindA !== behindB) return behindB - behindA;

              // Second priority: balance within the current half
              if (halfA !== halfB) return halfA - halfB;

              // Third priority: prefer players who just rested
              if (a.inPrevious !== b.inPrevious)
                return a.inPrevious - b.inPrevious;

              // Add randomization for variety in solutions
              return Math.random() - 0.5;
            });

            // Filter candidates by constraints first
            const validCandidates = [];
            for (const candidate of candidates) {
              rotation[candidate.idx][period] = 1;

              // Check inexperienced constraint
              if (!checkInexperienced(period)) {
                rotation[candidate.idx][period] = 0;
                continue;
              }

              // This candidate is valid
              validCandidates.push(candidate);
              rotation[candidate.idx][period] = 0;
            }

            // Try to assign with equity preference
            let assigned = false;
            for (const candidate of validCandidates) {
              rotation[candidate.idx][period] = 1;

              // Check if this would create too much inequity (10+ minute gap)
              const currentPlayTimes = players.map((_, idx) =>
                getPlayTime(idx)
              );
              const minPlayTime = Math.min(...currentPlayTimes);
              const maxPlayTime = Math.max(...currentPlayTimes);

              // If equity is maintained, use this candidate
              if (maxPlayTime - minPlayTime <= 10) {
                assigned = true;
                break;
              }

              // Otherwise, try next candidate
              rotation[candidate.idx][period] = 0;
            }

            // If no candidate met equity constraint, fall back to first valid candidate
            if (!assigned && validCandidates.length > 0) {
              rotation[validCandidates[0].idx][period] = 1;
              assigned = true;
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

        // Check if all validations pass
        const allValid = validation.every(
          (v) =>
            v.total >= 20 && v.half1 >= 10 && v.half2 >= 10 && v.maxConsec <= 15
        );

        // Also check that all periods have exactly 5 players
        const allPeriodsValid = Array.from({ length: periods }).every(
          (_, periodIdx) =>
            rotation.reduce((sum, player) => sum + player[periodIdx], 0) === 5
        );

        if (allValid && allPeriodsValid) {
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

  const generateCompleteCSV = () => {
    if (!solution) return "";

    const { rotation, players: solutionPlayers, validation } = solution;
    let csv = "";

    // Rotation Grid
    csv += "ROTATION GRID\n";
    csv +=
      "Player,Start,1H 15:00,1H 10:00,1H 5:00,2H 20:00,2H 15:00,2H 10:00,2H 5:00,Total\n";
    solutionPlayers.forEach((player, pIdx) => {
      csv += `${player.name},`;
      csv += rotation[pIdx].map((p) => (p === 1 ? "X" : "")).join(",");
      csv += `,${validation[pIdx].total} min\n`;
    });
    csv += "Per Period,";
    csv += periods
      .map((_, periodIdx) =>
        rotation.reduce((sum, player) => sum + player[periodIdx], 0)
      )
      .join(",");
    csv += ",\n\n";

    // Substitution Report
    csv += "SUBSTITUTION REPORT\n";
    csv += "Time,Player In,Player Out\n";
    periods.slice(1).forEach((period, idx) => {
      const periodNum = idx + 1;
      const prevPeriod = periodNum - 1;

      const prevOnCourt = solutionPlayers
        .filter((_, pIdx) => rotation[pIdx][prevPeriod] === 1)
        .map((p) => p.name);
      const currOnCourt = solutionPlayers
        .filter((_, pIdx) => rotation[pIdx][periodNum] === 1)
        .map((p) => p.name);

      const subsOut = prevOnCourt.filter((name) => !currOnCourt.includes(name));
      const subsIn = currOnCourt.filter((name) => !prevOnCourt.includes(name));

      const label = period;

      if (subsIn.length > 0) {
        subsIn.forEach((inPlayer, i) => {
          csv += `${label},${inPlayer},${subsOut[i] || ""}\n`;
        });
      } else {
        csv += `${label},No substitutions,\n`;
      }
    });
    csv += "\n";

    // Validation
    csv += "PLAYING TIME VALIDATION\n";
    csv += "Player,Total,1st Half,2nd Half,Max Consecutive,Valid\n";
    validation.forEach((v) => {
      const valid =
        v.total >= 20 && v.half1 >= 10 && v.half2 >= 10 && v.maxConsec <= 15;
      csv += `${v.name},${v.total},${v.half1},${v.half2},${v.maxConsec},${
        valid ? "YES" : "NO"
      }\n`;
    });

    return csv;
  };

  const copyToClipboard = (content) => {
    navigator.clipboard.writeText(content);
    alert("Copied! Paste into Google Sheets (Ctrl+V or Cmd+V)");
  };

  return (
    <div style={{ padding: "1.5rem", maxWidth: "1400px", margin: "0 auto" }}>
      <h1
        style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "1.5rem" }}
      >
        Basketball Rotation Generator
      </h1>

      {/* Player Configuration Section */}
      <div
        style={{
          marginBottom: "2rem",
          backgroundColor: "white",
          padding: "1.5rem",
          borderRadius: "0.5rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <h2
          style={{
            fontSize: "1.25rem",
            fontWeight: "bold",
            marginBottom: "1rem",
          }}
        >
          Player Configuration
        </h2>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              border: "1px solid #e5e7eb",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#f9fafb" }}>
                <th
                  style={{
                    padding: "0.75rem",
                    textAlign: "left",
                    border: "1px solid #e5e7eb",
                    fontWeight: "600",
                  }}
                >
                  Player Name
                </th>
                <th
                  style={{
                    padding: "0.75rem",
                    textAlign: "center",
                    border: "1px solid #e5e7eb",
                    fontWeight: "600",
                  }}
                >
                  Position
                </th>
                <th
                  style={{
                    padding: "0.75rem",
                    textAlign: "center",
                    border: "1px solid #e5e7eb",
                    fontWeight: "600",
                  }}
                >
                  Target Min
                </th>
                <th
                  style={{
                    padding: "0.75rem",
                    textAlign: "center",
                    border: "1px solid #e5e7eb",
                    fontWeight: "600",
                  }}
                >
                  Starter
                </th>
                <th
                  style={{
                    padding: "0.75rem",
                    textAlign: "center",
                    border: "1px solid #e5e7eb",
                    fontWeight: "600",
                  }}
                >
                  Closer
                </th>
                <th
                  style={{
                    padding: "0.75rem",
                    textAlign: "center",
                    border: "1px solid #e5e7eb",
                    fontWeight: "600",
                  }}
                >
                  Inexperienced
                </th>
                <th
                  style={{
                    padding: "0.75rem",
                    textAlign: "center",
                    border: "1px solid #e5e7eb",
                    fontWeight: "600",
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, index) => (
                <tr
                  key={index}
                  style={{
                    backgroundColor: index % 2 === 0 ? "white" : "#f9fafb",
                  }}
                >
                  <td
                    style={{ padding: "0.5rem", border: "1px solid #e5e7eb" }}
                  >
                    <input
                      type="text"
                      value={player.name}
                      onChange={(e) =>
                        updatePlayer(index, "name", e.target.value)
                      }
                      style={{
                        width: "100%",
                        padding: "0.375rem",
                        border: "1px solid #d1d5db",
                        borderRadius: "0.25rem",
                      }}
                    />
                  </td>
                  <td
                    style={{
                      padding: "0.5rem",
                      border: "1px solid #e5e7eb",
                      textAlign: "center",
                    }}
                  >
                    <select
                      value={player.position}
                      onChange={(e) =>
                        updatePlayer(index, "position", e.target.value)
                      }
                      style={{
                        padding: "0.375rem",
                        border: "1px solid #d1d5db",
                        borderRadius: "0.25rem",
                      }}
                    >
                      <option value="G">Guard</option>
                      <option value="F">Forward</option>
                    </select>
                  </td>
                  <td
                    style={{
                      padding: "0.5rem",
                      border: "1px solid #e5e7eb",
                      textAlign: "center",
                    }}
                  >
                    <input
                      type="number"
                      value={player.targetMinutes}
                      onChange={(e) =>
                        updatePlayer(
                          index,
                          "targetMinutes",
                          parseInt(e.target.value) || 0
                        )
                      }
                      style={{
                        width: "70px",
                        padding: "0.375rem",
                        border: "1px solid #d1d5db",
                        borderRadius: "0.25rem",
                        textAlign: "center",
                      }}
                      min="0"
                      max="40"
                      step="5"
                    />
                  </td>
                  <td
                    style={{
                      padding: "0.5rem",
                      border: "1px solid #e5e7eb",
                      textAlign: "center",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={starters.includes(player.name)}
                      onChange={() => toggleStarter(player.name)}
                      style={{
                        width: "18px",
                        height: "18px",
                        cursor: "pointer",
                      }}
                    />
                  </td>
                  <td
                    style={{
                      padding: "0.5rem",
                      border: "1px solid #e5e7eb",
                      textAlign: "center",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={closers.includes(player.name)}
                      onChange={() => toggleCloser(player.name)}
                      style={{
                        width: "18px",
                        height: "18px",
                        cursor: "pointer",
                      }}
                    />
                  </td>
                  <td
                    style={{
                      padding: "0.5rem",
                      border: "1px solid #e5e7eb",
                      textAlign: "center",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={inexperienced.includes(player.name)}
                      onChange={() => toggleInexperienced(player.name)}
                      style={{
                        width: "18px",
                        height: "18px",
                        cursor: "pointer",
                      }}
                    />
                  </td>
                  <td
                    style={{
                      padding: "0.5rem",
                      border: "1px solid #e5e7eb",
                      textAlign: "center",
                    }}
                  >
                    <button
                      onClick={() => removePlayer(index)}
                      style={{
                        padding: "0.25rem 0.5rem",
                        backgroundColor: "#ef4444",
                        color: "white",
                        border: "none",
                        borderRadius: "0.25rem",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                      }}
                      onMouseOver={(e) =>
                        (e.target.style.backgroundColor = "#dc2626")
                      }
                      onMouseOut={(e) =>
                        (e.target.style.backgroundColor = "#ef4444")
                      }
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div
          style={{
            marginTop: "1rem",
            display: "flex",
            gap: "1rem",
            alignItems: "center",
          }}
        >
          <button
            onClick={solvePuzzle}
            style={{
              padding: "0.75rem 2rem",
              backgroundColor: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "0.375rem",
              fontSize: "1.125rem",
              fontWeight: "700",
              cursor: "pointer",
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = "#1d4ed8")}
            onMouseOut={(e) => (e.target.style.backgroundColor = "#2563eb")}
          >
            🏀 Generate Rotation
          </button>

          <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
            Starters: {starters.length}/5 | Closers: {closers.length}/5
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
          <div style={{ overflowX: "auto", marginBottom: "1.5rem" }}>
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: "bold",
                marginBottom: "1rem",
              }}
            >
              Rotation Schedule
            </h2>
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
                        {playing === 1 ? "X" : ""}
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
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <h3
              style={{
                fontSize: "1.25rem",
                fontWeight: "bold",
                marginBottom: "0.5rem",
              }}
            >
              Substitution Report
            </h3>
            <table
              style={{
                borderCollapse: "collapse",
                width: "100%",
                border: "1px solid #d1d5db",
                fontSize: "0.875rem",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#f3f4f6" }}>
                  <th
                    style={{
                      border: "1px solid #d1d5db",
                      padding: "0.5rem",
                      textAlign: "left",
                    }}
                  >
                    Time
                  </th>
                  <th
                    style={{
                      border: "1px solid #d1d5db",
                      padding: "0.5rem",
                      textAlign: "left",
                    }}
                  >
                    Action
                  </th>
                </tr>
              </thead>
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
                      .map((p) => p.name)
                      .join(", ")}
                  </td>
                </tr>

                {/* Substitutions for each period */}
                {periods.slice(1).map((period, idx) => {
                  const periodNum = idx + 1;
                  const prevPeriod = periodNum - 1;

                  const prevOnCourt = solution.players
                    .filter(
                      (_, pIdx) => solution.rotation[pIdx][prevPeriod] === 1
                    )
                    .map((p) => p.name);
                  const currOnCourt = solution.players
                    .filter(
                      (_, pIdx) => solution.rotation[pIdx][periodNum] === 1
                    )
                    .map((p) => p.name);

                  const subsOut = prevOnCourt.filter(
                    (name) => !currOnCourt.includes(name)
                  );
                  const subsIn = currOnCourt.filter(
                    (name) => !prevOnCourt.includes(name)
                  );

                  return (
                    <tr
                      key={idx}
                      style={{
                        backgroundColor: "transparent",
                      }}
                    >
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
                          <span>{currOnCourt.join(", ")}</span>
                        ) : subsIn.length > 0 ? (
                          subsIn.map((inPlayer, i) => (
                            <div key={i}>
                              <span style={{ color: "#15803d" }}>
                                {inPlayer}
                              </span>
                              {" → "}
                              <span style={{ color: "#b91c1c" }}>
                                {subsOut[i] || "???"}
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
              </tbody>
            </table>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <h3
              style={{
                fontSize: "1.25rem",
                fontWeight: "bold",
                marginBottom: "0.5rem",
              }}
            >
              Validation Summary
            </h3>
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
                    Max Consecutive
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
                    v.total >= 20 &&
                    v.half1 >= 10 &&
                    v.half2 >= 10 &&
                    v.maxConsec <= 15;
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
          </div>

          <div style={{ marginTop: "2rem", textAlign: "center" }}>
            <button
              onClick={() => copyToClipboard(generateCompleteCSV())}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#f3f4f6",
                color: "#4b5563",
                border: "1px solid #d1d5db",
                borderRadius: "0.25rem",
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = "#e5e7eb";
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = "#f3f4f6";
              }}
            >
              Copy as CSV
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default BasketballRotation;

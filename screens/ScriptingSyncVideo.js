import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from "react-native";
import {
  GestureHandlerRootView,
  GestureDetector,
} from "react-native-gesture-handler";
import YoutubePlayer from "react-native-youtube-iframe";
import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import TemplateViewWithTopChildrenSmall from "./subcomponents/TemplateViewWithTopChildrenSmall";
import ButtonKvNoDefault from "./subcomponents/buttons/ButtonKvNoDefault";
import ButtonKvNoDefaultTextOnly from "./subcomponents/buttons/ButtonKvNoDefaultTextOnly";
import Timeline from "./subcomponents/Timeline";

export default function ScriptingSyncVideo({ navigation }) {
  // const reviewReducer = useSelector((state) => state.review);
  const syncReducer = useSelector((state) => state.sync);
  const userReducer = useSelector((state) => state.user);

  const [scriptsArray, setScriptsArray] = useState([]);

  const fetchScriptsArray = async () => {
    console.log("--- > in fetchScriptsArray");
    console.log(
      "syncReducer.syncReducerSelectedVideoObject.session.id: ",
      syncReducer.syncReducerSelectedVideoObject.session.id
    );

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/sessions/scripting-sync-video-screen/get-actions-for-syncing/${syncReducer.syncReducerSelectedVideoObject.session.id}`,
      // `${process.env.EXPO_PUBLIC_API_URL}/sessions/scripting-sync-video-screen/get-actions-for-syncing/${syncReducer.syncReducerSelectedVideoObject.id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userReducer.token}`,
        },
      }
    );

    console.log("Received response:", response.status);

    let resJson = null;
    const contentType = response.headers.get("Content-Type");

    // console.log("contentType: ", contentType);

    if (contentType?.includes("application/json")) {
      resJson = await response.json();
    }

    if (response.ok && resJson) {
      console.log(`response ok`);
      const tempArray = resJson.actionsArrayByScript.map((item) => {
        return {
          ...item,
          selected: false,
        };
      });
      // console.log(`Count of scripts: ${tempArray.length}`);
      // console.log(`tempArray: ${JSON.stringify(tempArray, null, 2)}`);
      setScriptsArray(tempArray);
    } else {
      const errorMessage =
        resJson?.error ||
        `There was a server error (and no resJson): ${response.status}`;
      alert(errorMessage);
    }
  };

  useEffect(() => {
    fetchScriptsArray();
  }, []);

  // -------------
  // YouTube Stuff
  // -------------
  const playerRef = useRef();
  const [playing, setPlaying] = useState(false);
  const playingRef = useRef(playing);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    const interval = setInterval(async () => {
      // console.log("playing: ", playingRef.current);
      if (playerRef.current && playingRef.current) {
        // console.log("--> in interval");
        const time = await playerRef.current.getCurrentTime();
        setCurrentTime(time);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []); // <- note: no dependency on `playing`

  const handleStateChange = (state) => {
    if (state === "playing" && playerRef.current) {
      playerRef.current.getDuration().then((dur) => {
        setDuration(dur);
        console.log("duration: ", dur);
      });
    }
  };

  const togglePlaying = () => {
    setPlaying((prev) => !prev);
  };

  const rewind = async () => {
    if (playerRef.current) {
      const currentTime = await playerRef.current.getCurrentTime();
      playerRef.current.seekTo(Math.max(currentTime - 2, 0), true);
    }
  };

  const forward = async () => {
    if (playerRef.current) {
      const currentTime = await playerRef.current.getCurrentTime();
      playerRef.current.seekTo(currentTime + 5, true);
    }
  };
  // -----------
  // Manage Time Delta
  // -----------
  const handleSelectedScript = (script) => {
    // console.log("script: ", script);
    const isSelected = script.selected;
    const tempArray = scriptsArray.map((item) => {
      if (item.scriptId === script.scriptId) {
        return {
          ...item,
          selected: !isSelected,
        };
      } else {
        return {
          ...item,
          selected: false,
        };
      }
    });
    setScriptsArray(tempArray);
  };

  const handleSyncScriptsToSession = async () => {
    console.log("handleSyncScriptsToSession");
    const selectedScript = scriptsArray.find((item) => item.selected);

    if (!selectedScript) {
      alert("Please select a script");
      return;
    }

    const response = await fetch(
      // `${process.env.EXPO_PUBLIC_API_URL}/contract-script-video/modify-delta-time/${selectedScript.contractScriptVideoId}`,
      // `${process.env.EXPO_PUBLIC_API_URL}/contract-video-actions/scripting-sync-video-screen/update-delta-time-all-actions-in-script/${selectedScript.scriptId}`,
      `${process.env.EXPO_PUBLIC_API_URL}/contract-video-actions/scripting-sync-video-screen/update-delta-time-all-actions-in-script`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userReducer.token}`,
        },
        body: JSON.stringify({
          newDeltaTimeInSeconds: currentTime,
          scriptId: selectedScript.scriptId,
          videoId: syncReducer.syncReducerSelectedVideoObject.id,
        }),
      }
    );
    let resJson = null;
    const contentType = response.headers.get("Content-Type");

    if (contentType?.includes("application/json")) {
      resJson = await response.json();
    }

    if (response.ok && resJson) {
      const tempArray = scriptsArray.map((item) => {
        if (item.scriptId === selectedScript.scriptId) {
          return {
            ...item,
            deltaTimeInSeconds: currentTime,
          };
        } else {
          return item;
        }
      });

      setScriptsArray(tempArray);
      alert("Script delta time modified successfully");
    } else {
      const errorMessage =
        resJson?.error ||
        `There was a server error (and no resJson): ${response.status}`;
      alert(errorMessage);
    }
  };

  return (
    <TemplateViewWithTopChildrenSmall
      navigation={navigation}
      topHeight="20%"
      topChildren={<Text>Synchronize Video</Text>}
    >
      <View style={styles.container}>
        <View style={styles.containerTop}>
          <Text>{syncReducer.syncReducerSelectedVideoObject.id}</Text>
          <Text>
            {syncReducer.syncReducerSelectedVideoObject.youTubeVideoId}
          </Text>
        </View>
        <View style={styles.containerMiddle}>
          <View style={styles.videoWrapper}>
            <YoutubePlayer
              ref={playerRef}
              height={220}
              width={Dimensions.get("window").width}
              play={playing}
              videoId={
                syncReducer.syncReducerSelectedVideoObject.youTubeVideoId
              }
              onChangeState={handleStateChange}
              webViewProps={{
                allowsInlineMediaPlayback: true,
              }}
              initialPlayerParams={{
                controls: 0,
                modestbranding: true,
                rel: 0,
                showinfo: false,
              }}
            />
            <View style={styles.coverView} />
          </View>
          <View style={styles.vwButtonContainer}>
            <View style={styles.vwManagePlaybackButtons}>
              <TouchableOpacity onPress={rewind} style={styles.skipButton}>
                <Text style={styles.playPauseButtonText}>-2s</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={togglePlaying}
                style={styles.playPauseButton}
              >
                <Text style={styles.playPauseButtonText}>
                  {playing ? "Pause" : "Play"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={forward} style={styles.skipButton}>
                <Text style={styles.playPauseButtonText}>+5s</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.vwDisplayTime}>
              <Text>Current Time: {currentTime.toFixed(1)} s</Text>
              <Text>Duration: {duration.toFixed(1)} s</Text>
            </View>
          </View>
          <View
            style={{
              width: Dimensions.get("window").width,
              height: 15,
              zIndex: 2,
              marginVertical: 10,
            }}
          >
            <GestureHandlerRootView style={styles.gestureViewTimeline}>
              <Timeline
                timelineWidth={Dimensions.get("window").width * 0.8}
                playerRef={playerRef}
                currentTime={currentTime}
                duration={duration}
                onSeek={(time) => setCurrentTime(time)}
              />
            </GestureHandlerRootView>
          </View>
        </View>
        <View style={styles.containerBottom}>
          <Text>Scripts Linked to Session</Text>
          <View style={styles.vwInstructions}>
            <Text style={{ fontSize: 12 }}>
              <Text style={{ fontWeight: "bold" }}>Instructions:</Text> Sync
              each script by advancing the video to the first action of each
              script and update that script’s timestampReferenceFirstAction.
            </Text>
          </View>
          <FlatList
            data={scriptsArray}
            renderItem={({ item }) => (
              <ButtonKvNoDefault
                onPress={() => handleSelectedScript(item)}
                styleView={
                  item.selected
                    ? styles.vwScriptRowSelected
                    : styles.vwScriptRow
                }
              >
                <View style={styles.vwScriptDetailsRow}>
                  <Text style={styles.scriptText}>
                    Script ID: {item.scriptId}
                  </Text>
                  <Text style={styles.scriptText}>
                    Action Count: {item.actionsArray.length}
                  </Text>
                </View>
                <View style={styles.vwScriptDeltaTimeRow}>
                  <Text style={styles.scriptText}>
                    Delta Time In Seconds: {item.deltaTimeInSeconds.toFixed(1)}
                  </Text>
                </View>
                {/* <View style={styles.vwScriptDeltaTimeRow}>
                  <Text style={styles.scriptText}>
                    Same delta for all actions in script:{" "}
                    {item.deltaTimeInSecondsIsSameForAllActions ? "Yes" : "No"}
                  </Text>
                </View> */}
              </ButtonKvNoDefault>
            )}
            keyExtractor={(item) => item.scriptId.toString()}
            // keyExtractor={(item) => item.id.toString()}
          />
          <View style={styles.vwBottomButtonContainer}>
            {/* <Text> Modify Delta Time </Text> */}
            <ButtonKvNoDefaultTextOnly
              onPress={handleSyncScriptsToSession}
              styleView={styles.btnSyncScriptsToSession}
              styleText={styles.btnSyncScriptsToSessionText}
            >
              Update delta time of selected script
            </ButtonKvNoDefaultTextOnly>
          </View>
        </View>
      </View>
    </TemplateViewWithTopChildrenSmall>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerTop: {
    height: 5,
    alignItems: "center",
    justifyContent: "center",
    // padding: 20,
    // borderWidth: 4,
    // borderColor: "gray",
    // borderStyle: "dashed",
  },

  // ----- TOP Childeren -----

  // ----- MIDDLE -----
  containerMiddle: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "gray",
    width: Dimensions.get("window").width,
    // borderWidth: 4,
    // borderColor: "gray",
    // borderStyle: "dashed",
  },
  videoWrapper: {
    position: "relative",
    width: "100%",
    // height: 220,
  },
  coverView: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
    opacity: 0.7,
    zIndex: 2,
  },
  vwButtonContainer: {
    marginTop: 20,
    alignItems: "center",
    flexDirection: "row",
    // backgroundColor: "green",
    width: "100%",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  vwManagePlaybackButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  playPauseButton: {
    backgroundColor: "black",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  skipButton: {
    backgroundColor: "black",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  playPauseButtonText: {
    color: "white",
    fontSize: 16,
  },
  vwDisplayTime: {
    gap: 10,
  },
  gestureViewTimeline: {
    // width: Dimensions.get("window").width * 0.8,
    alignItems: "center",
    justifyContent: "center",
  },

  // -----
  // BOTTOM
  // -----
  containerBottom: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    width: Dimensions.get("window").width,
    // borderWidth: 4,
    // borderColor: "gray",
    // borderStyle: "dashed",
  },
  vwInstructions: {
    padding: 10,
    backgroundColor: "#E8E8E8",
    borderRadius: 10,
    width: Dimensions.get("window").width * 0.9,
  },
  vwScriptRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    // gap: 10,
    padding: 10,
    backgroundColor: "#E8E8E8",
    width: Dimensions.get("window").width * 0.8,
    borderRadius: 10,
    borderColor: "#806181",
    borderWidth: 1,
    marginVertical: 3,
  },
  vwScriptRowSelected: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    // gap: 10,
    padding: 10,
    backgroundColor: "#E8E8E8",
    width: Dimensions.get("window").width * 0.8,
    borderRadius: 10,
    borderColor: "#806181",
    borderWidth: 10,
    marginVertical: 3,
  },
  vwScriptDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    // justifyContent: "space-between",
    gap: 10,
    width: "100%",
  },
  vwScriptDeltaTimeRow: {
    width: Dimensions.get("window").width * 0.8,
  },
  vwBottomButtonContainer: {
    marginTop: 20,
    alignItems: "center",
    width: "100%",
    justifyContent: "space-between",
    marginBottom: 50,
  },
  btnSyncScriptsToSession: {
    // backgroundColor: "black",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 35,
    backgroundColor: "#806181",
  },
  btnSyncScriptsToSessionText: {
    color: "white",
    fontSize: 16,
  },
});

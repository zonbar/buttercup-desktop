import React, { useContext, useEffect, useMemo, useState } from "react";
import { useState as useHookState } from "@hookstate/core";
import { Button, Intent, NonIdealState, Tag } from "@blueprintjs/core";
import { VaultProvider, VaultUI, themes } from "@buttercup/ui";
import { VaultFacade, VaultSourceStatus } from "buttercup";
import styled, { ThemeProvider } from "styled-components";
import { SearchContext } from "./search/SearchContext";
import { VAULTS_LIST } from "../state/vaults";
import { SAVING } from "../state/app";
import { fetchUpdatedFacade } from "../actions/facade";
import { saveVaultFacade } from "../actions/saveVault";
import { toggleAutoUpdate } from "../actions/autoUpdate";
import { useCurrentFacade } from "../hooks/facade";
import { useTheme } from "../hooks/theme";
import { logErr, logInfo } from "../library/log";
import { getThemeProp } from "../styles/theme";
import { t } from "../../shared/i18n/trans";
import { Theme } from "../types";

import "@buttercup/ui/dist/styles.css";

const BENCH_IMAGE = require("../../../resources/images/bench.png").default;

interface VaultEditorProps {
    onUnlockRequest: () => void;
    sourceID: string;
}

const LockedImage = styled.img`
    max-height: 308px;
    width: auto;
`;
const LockedNonIdealState = styled(NonIdealState)`
    background-color: ${props => getThemeProp(props, "base.contentBgColor")};

    > .bp3-non-ideal-state-visual {
        margin-bottom: 0;
    }
`;

export function VaultEditor(props: VaultEditorProps) {
    const { onUnlockRequest } = props;
    const currentFacade = useCurrentFacade();
    const vaultListState = useHookState(VAULTS_LIST);
    const savingState = useHookState(SAVING);
    const vaultItem = useMemo(() => {
        const vaultList = vaultListState.get();
        return vaultList.find(item => item.id === props.sourceID) || null;
    }, [vaultListState.get()]);
    const themeType = useTheme();
    const [currentlyEditing, setCurrentlyEditing] = useState(false);
    useEffect(() => {
        if (vaultItem && vaultItem.state === VaultSourceStatus.Unlocked) {
            fetchUpdatedFacade(vaultItem.id);
        }
    }, [props.sourceID, vaultItem?.state]);
    useEffect(() => {
        logInfo(`Toggling auto-update for vault editing (editing=${currentlyEditing}, auto-update=${!currentlyEditing})`);
        toggleAutoUpdate(!currentlyEditing).catch(err => {
            logErr("Failed toggling auto-update", err);
        });
    }, [currentlyEditing]);
    // Search
    const {
        resetSelection,
        selectedEntryID,
        selectedGroupID,
        setSelectedEntryID,
        setSelectedGroupID
    } = useContext(SearchContext);
    useEffect(() => {
        return () => {
            // Reset search on unmount
            resetSelection();
        };
    }, []);
    // Optional rendering
    if (!vaultItem) return null;
    if (vaultItem.state !== VaultSourceStatus.Unlocked) {
        return (
            <LockedNonIdealState
                icon={
                    <LockedImage src={BENCH_IMAGE} />
                }
                title="Vault Locked"
                action={
                    <Tag
                        icon="unlock"
                        interactive
                        intent={Intent.PRIMARY}
                        large
                        onClick={() => onUnlockRequest()}
                        round
                    >
                        {vaultItem.name}
                    </Tag>
                }
            />
        );
    }
    // Normal output
    return (
        <>
            {currentFacade && (
                <ThemeProvider theme={themeType === Theme.Dark ? themes.dark : themes.light}>
                    <VaultProvider
                        icons
                        iconsPath="icons"
                        onEditing={setCurrentlyEditing}
                        onSelectEntry={setSelectedEntryID}
                        onSelectGroup={setSelectedGroupID}
                        onUpdate={(vaultFacade: VaultFacade) => {
                            saveVaultFacade(vaultItem.id, vaultFacade);
                        }}
                        readOnly={savingState.get()}
                        selectedEntry={selectedEntryID}
                        selectedGroup={selectedGroupID}
                        vault={currentFacade}
                    >
                        <VaultUI />
                    </VaultProvider>
                </ThemeProvider>
            )}
        </>
    );
}

export const clearPlayerSession = (): void => {
    sessionStorage.removeItem('ludoGameId');
    sessionStorage.removeItem('ludoPlayerName');
};
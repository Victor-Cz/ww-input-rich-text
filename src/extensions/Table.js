import BaseTable from '@tiptap/extension-table';
import { columnResizing, tableEditing } from '@tiptap/pm/tables';

/**
 * Table de TipTap, avec son rendu installé même si l'éditeur naît en lecture
 * seule.
 *
 * TipTap ne pose le plugin columnResizing que si l'éditeur est éditable à sa
 * création. Or c'est ce plugin qui fournit le rendu des tableaux (TableView :
 * enveloppe .tableWrapper, colgroup). Un éditeur créé verrouillé (génération
 * en cours, Brispr qui écrit, aperçu de version) affichait donc des tableaux
 * sans ce rendu, et setEditable(true) ne le rattrapait pas : il fallait
 * recharger l'éditeur.
 *
 * Le poser toujours est sans risque : prosemirror-tables ignore lui-même les
 * gestes de redimensionnement quand la vue n'est pas éditable.
 */
export const Table = BaseTable.extend({
    addProseMirrorPlugins() {
        return [
            ...(this.options.resizable
                ? [
                      columnResizing({
                          handleWidth: this.options.handleWidth,
                          cellMinWidth: this.options.cellMinWidth,
                          defaultCellMinWidth: this.options.cellMinWidth,
                          View: this.options.View,
                          lastColumnResizable: this.options.lastColumnResizable,
                      }),
                  ]
                : []),
            tableEditing({
                allowTableNodeSelection: this.options.allowTableNodeSelection,
            }),
        ];
    },
});
